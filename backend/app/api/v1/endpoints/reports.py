from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, cast, Date, case
from datetime import datetime, date, timedelta
from app.api import deps
from app.models.user import User, UserRole
from app.models.sales import Plan, ReservationItem, Reservation, DoctorFactAssignment
from app.models.ledger import BonusLedger, DoctorMonthlyStat
from app.models.crm import Doctor
from app.models.product import Product
import calendar
from app.services.audit_service import log_action

router = APIRouter()

@router.get("")
async def get_comprehensive_reports(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    start_date: date = Query(None),
    end_date: date = Query(None),
    period: str = Query("monthly", pattern="^(daily|weekly|monthly|quarterly|yearly)$"),
    product_id: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    med_rep_id: Optional[int] = Query(None),
    product_manager_id: Optional[int] = Query(None),
    group_by: str = Query("doctor", pattern="^(doctor|medrep)$")
) -> Any:
    """
    Get comprehensive reports for the dashboard with advanced filtering and dynamic grouping.
    Supports monitoring both Doctor performance and MedRep performance (Plan vs Fact).
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.ACCOUNTANT, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    from app.models.crm import MedicalOrganization
    from app.crud.crud_user import get_descendant_ids

    # 0. Handle Team Hierarchy
    target_rep_ids = None
    if med_rep_id:
        target_rep_ids = [med_rep_id]
    elif product_manager_id:
        target_rep_ids = await get_descendant_ids(db, product_manager_id)
    
    # RM/PM/FFM can only see their descendants
    if current_user.role in [UserRole.REGIONAL_MANAGER, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER]:
        my_descendants = await get_descendant_ids(db, current_user.id)
        if target_rep_ids:
            target_rep_ids = [rid for rid in target_rep_ids if rid in my_descendants]
        else:
            target_rep_ids = my_descendants

    report_map = {}
    is_medrep_view = group_by == "medrep"

    # 1. Fetch Plans
    if is_medrep_view:
        id_col = Plan.med_rep_id
        name_col = User.full_name
        plans_q = select(id_col.label("id"), name_col.label("name"), func.sum(Plan.target_amount).label("p_amount"), func.sum(Plan.target_quantity).label("p_qty"))\
            .join(User, User.id == Plan.med_rep_id, isouter=True)
    else:
        id_col = Plan.doctor_id
        name_col = Doctor.full_name
        plans_q = select(id_col.label("id"), name_col.label("name"), func.sum(Plan.target_amount).label("p_amount"), func.sum(Plan.target_quantity).label("p_qty"))\
            .join(Doctor, Doctor.id == Plan.doctor_id, isouter=True)

    if start_date and end_date:
        plans_q = plans_q.where(Plan.year >= start_date.year, Plan.year <= end_date.year)
    if target_rep_ids:
        plans_q = plans_q.where(Plan.med_rep_id.in_(target_rep_ids))
    if product_id:
        plans_q = plans_q.where(Plan.product_id == product_id)
    if region_id:
        plans_q = plans_q.join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)

    plans_q = plans_q.group_by(id_col, name_col)
    plans_res = await db.execute(plans_q)
    for row in plans_res.all():
        if row.id:
            report_map[row.id] = {
                "name": row.name or f"Entity #{row.id}",
                "plan_amount": float(row.p_amount or 0),
                "plan_quantity": int(row.p_qty or 0),
                "fact_amount": 0.0,
                "fact_quantity": 0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0
            }

    # 2. Fetch Aggregated Sales (Fact)
    if is_medrep_view:
        id_col = DoctorFactAssignment.med_rep_id
        name_col = User.full_name
        sales_q = select(id_col.label("id"), name_col.label("name"), func.sum(DoctorFactAssignment.amount).label("f_amount"), func.sum(DoctorFactAssignment.quantity).label("f_qty"))\
            .join(User, User.id == DoctorFactAssignment.med_rep_id)
    else:
        id_col = DoctorFactAssignment.doctor_id
        name_col = Doctor.full_name
        sales_q = select(id_col.label("id"), name_col.label("name"), func.sum(DoctorFactAssignment.amount).label("f_amount"), func.sum(DoctorFactAssignment.quantity).label("f_qty"))\
            .join(Doctor, Doctor.id == DoctorFactAssignment.doctor_id)

    if start_date and end_date:
        sales_q = sales_q.where(cast(DoctorFactAssignment.created_at, Date) >= start_date, cast(DoctorFactAssignment.created_at, Date) <= end_date)
    if target_rep_ids:
        sales_q = sales_q.where(DoctorFactAssignment.med_rep_id.in_(target_rep_ids))
    if product_id:
        sales_q = sales_q.where(DoctorFactAssignment.product_id == product_id)
    if region_id:
        # Consistency check for region filtering
        sales_q = sales_q.join(MedicalOrganization, DoctorFactAssignment.doctor_id == MedicalOrganization.id if is_medrep_view else Doctor.med_org_id == MedicalOrganization.id, isouter=True)\
                         .where(MedicalOrganization.region_id == region_id)

    sales_q = sales_q.group_by(id_col, name_col)
    sales_res = await db.execute(sales_q)
    for row in sales_res.all():
        if row.id not in report_map:
            report_map[row.id] = {"name": row.name or f"Entity #{row.id}", "plan_amount": 0.0, "plan_quantity": 0, "fact_amount": 0.0, "fact_quantity": 0, "earned_bonus": 0.0, "predinvest_given": 0.0, "predinvest_paid_off": 0.0}
        report_map[row.id]["fact_amount"] += float(row.f_amount or 0)
        report_map[row.id]["fact_quantity"] += int(row.f_qty or 0)

    # 3. Fetch Bonus Ledger
    if is_medrep_view:
        id_col = BonusLedger.user_id
        name_col = User.full_name
        bonus_q = select(id_col.label("id"), name_col.label("name"),
                         func.sum(case((BonusLedger.ledger_type == "accrual", BonusLedger.amount), else_=0)).label("bonus"),
                         func.sum(case((BonusLedger.ledger_type == "advance", -BonusLedger.amount), else_=0)).label("advance"),
                         func.sum(case((BonusLedger.ledger_type == "offset", -BonusLedger.amount), else_=0)).label("offset"))\
            .join(User, User.id == BonusLedger.user_id)
    else:
        id_col = BonusLedger.doctor_id
        name_col = Doctor.full_name
        bonus_q = select(id_col.label("id"), name_col.label("name"),
                         func.sum(case((BonusLedger.ledger_type == "accrual", BonusLedger.amount), else_=0)).label("bonus"),
                         func.sum(case((BonusLedger.ledger_type == "advance", -BonusLedger.amount), else_=0)).label("advance"),
                         func.sum(case((BonusLedger.ledger_type == "offset", -BonusLedger.amount), else_=0)).label("offset"))\
            .join(Doctor, Doctor.id == BonusLedger.doctor_id)

    if start_date and end_date:
        bonus_q = bonus_q.where(cast(BonusLedger.created_at, Date) >= start_date, cast(BonusLedger.created_at, Date) <= end_date)
    if target_rep_ids:
        bonus_q = bonus_q.where(BonusLedger.user_id.in_(target_rep_ids))
    if region_id:
        bonus_q = bonus_q.join(Doctor, Doctor.id == BonusLedger.doctor_id).join(MedicalOrganization, Doctor.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)

    bonus_q = bonus_q.group_by(id_col, name_col)
    bonus_res = await db.execute(bonus_q)
    for row in bonus_res.all():
        if row.id not in report_map:
            report_map[row.id] = {"name": row.name or f"Entity #{row.id}", "plan_amount": 0.0, "plan_quantity": 0, "fact_amount": 0.0, "fact_quantity": 0, "earned_bonus": 0.0, "predinvest_given": 0.0, "predinvest_paid_off": 0.0}
        report_map[row.id]["earned_bonus"] = float(row.bonus or 0)
        report_map[row.id]["predinvest_given"] = float(row.advance or 0)
        report_map[row.id]["predinvest_paid_off"] = float(row.offset or 0)

    summary = []
    for rid, data in report_map.items():
        summary.append({
            "id": rid,
            "name": data["name"],
            "plan_amount": data["plan_amount"],
            "plan_quantity": data["plan_quantity"],
            "fact_amount": data["fact_amount"],
            "fact_quantity": data["fact_quantity"],
            "earned_bonus": data["earned_bonus"],
            "predinvest_given": data["predinvest_given"],
            "predinvest_paid_off": data["predinvest_paid_off"]
        })

    await log_action(
        db, current_user, "REPORT_VIEW", "Analytics", 0,
        f"Загружен комплексный отчет ({group_by}) с фильтрами: {start_date} - {end_date}",
        request
    )

    return {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "group_by": group_by,
        "data": summary
    }
