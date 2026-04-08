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
    product_manager_id: Optional[int] = Query(None)
) -> Any:
    """
    Get comprehensive reports for the dashboard with advanced filtering.
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.ACCOUNTANT]:
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

    # 1. Fetch Plans
    plans_query = select(
        Plan.doctor_id,
        Doctor.full_name.label("doctor_name"),
        func.sum(Plan.target_quantity).label("plan_quantity"),
        func.sum(Plan.target_amount).label("plan_amount")
    ).join(Doctor, Doctor.id == Plan.doctor_id, isouter=True)

    if start_date and end_date:
        plans_query = plans_query.where(Plan.year >= start_date.year, Plan.year <= end_date.year)
    if target_rep_ids:
        plans_query = plans_query.where(Plan.med_rep_id.in_(target_rep_ids))
    if product_id:
        plans_query = plans_query.where(Plan.product_id == product_id)
    if region_id:
        plans_query = plans_query.join(MedicalOrganization, Doctor.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)

    plans_query = plans_query.group_by(Plan.doctor_id, Doctor.full_name)
    plans_result = await db.execute(plans_query)
    
    report_map = {}
    for row in plans_result.all():
        doc_id = row.doctor_id
        if doc_id:
            report_map[doc_id] = {
                "doctor_name": row.doctor_name or f"Doctor #{doc_id}",
                "plan_quantity": row.plan_quantity or 0,
                "plan_amount": float(row.plan_amount or 0),
                "fact_quantity": 0,
                "fact_amount": 0.0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0,
            }

    # 2. Fetch Aggregated Sales (Fact)
    sales_query = select(
        DoctorFactAssignment.doctor_id,
        Doctor.full_name.label("doctor_name"),
        func.sum(DoctorFactAssignment.quantity).label("fact_quantity"),
        func.sum(DoctorFactAssignment.amount).label("fact_amount"),
    ).join(Doctor, Doctor.id == DoctorFactAssignment.doctor_id)

    if start_date and end_date:
        sales_query = sales_query.where(cast(DoctorFactAssignment.created_at, Date) >= start_date, cast(DoctorFactAssignment.created_at, Date) <= end_date)
    if target_rep_ids:
        sales_query = sales_query.where(DoctorFactAssignment.med_rep_id.in_(target_rep_ids))
    if product_id:
        sales_query = sales_query.where(DoctorFactAssignment.product_id == product_id)
    if region_id:
        sales_query = sales_query.join(MedicalOrganization, Doctor.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)

    sales_query = sales_query.group_by(DoctorFactAssignment.doctor_id, Doctor.full_name)
    sales_result = await db.execute(sales_query)
    for row in sales_result.all():
        doc_id = row.doctor_id
        if doc_id not in report_map:
            report_map[doc_id] = {
                "doctor_name": row.doctor_name,
                "plan_quantity": 0,
                "plan_amount": 0.0,
                "fact_quantity": 0,
                "fact_amount": 0.0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0,
            }
        report_map[doc_id]["fact_quantity"] += (row.fact_quantity or 0)
        report_map[doc_id]["fact_amount"] += (row.fact_amount or 0.0)

    # 3. Fetch Bonus Ledger
    bonuses_query = select(
        BonusLedger.doctor_id,
        func.sum(case((BonusLedger.ledger_type == "accrual", BonusLedger.amount), else_=0)).label("earned_bonus"),
        func.sum(case((BonusLedger.ledger_type == "advance", -BonusLedger.amount), else_=0)).label("predinvest_given"),
        func.sum(case((BonusLedger.ledger_type == "offset", -BonusLedger.amount), else_=0)).label("predinvest_paid_off")
    ).join(Doctor, Doctor.id == BonusLedger.doctor_id)

    if start_date and end_date:
        bonuses_query = bonuses_query.where(cast(BonusLedger.created_at, Date) >= start_date, cast(BonusLedger.created_at, Date) <= end_date)
    if target_rep_ids:
        bonuses_query = bonuses_query.where(BonusLedger.user_id.in_(target_rep_ids))
    if region_id:
        bonuses_query = bonuses_query.join(MedicalOrganization, Doctor.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)

    bonuses_query = bonuses_query.where(BonusLedger.doctor_id.isnot(None)).group_by(BonusLedger.doctor_id)
    bonuses_result = await db.execute(bonuses_query)
    for row in bonuses_result.all():
        doc_id = row.doctor_id
        if doc_id not in report_map:
            report_map[doc_id] = {
                "doctor_name": f"Doctor #{doc_id}",
                "plan_quantity": 0,
                "plan_amount": 0.0,
                "fact_quantity": 0,
                "fact_amount": 0.0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0,
            }
        report_map[doc_id]["earned_bonus"] = float(row.earned_bonus or 0)
        report_map[doc_id]["predinvest_given"] = float(row.predinvest_given or 0)
        report_map[doc_id]["predinvest_paid_off"] = float(row.predinvest_paid_off or 0)

    summary = []
    for doc_id, data in report_map.items():
        summary.append({
            "doctor_id": doc_id,
            "doctor_name": data["doctor_name"],
            "plan_quantity": data.get("plan_quantity", 0),
            "plan_amount": data.get("plan_amount", 0.0),
            "fact_quantity": data["fact_quantity"],
            "fact_amount": data["fact_amount"],
            "earned_bonus": data["earned_bonus"],
            "predinvest_given": data["predinvest_given"],
            "predinvest_paid_off": data["predinvest_paid_off"],
        })

    await log_action(
        db, current_user, "REPORT_DOWNLOAD", "Analytics", 0,
        f"Загружен комплексный отчет с фильтрами: {start_date} - {end_date}",
        request
    )

    return {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "data": summary
    }
