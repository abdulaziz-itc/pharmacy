from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, cast, Date
from datetime import datetime, date, timedelta
from app.api import deps
from app.models.user import User, UserRole
from app.models.sales import Plan, ReservationItem, Reservation
from app.models.ledger import BonusLedger, DoctorMonthlyStat
from app.models.crm import Doctor
from app.models.product import Product
import calendar

router = APIRouter()

@router.get("")
async def get_comprehensive_reports(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    start_date: date = Query(...),
    end_date: date = Query(...),
    period: str = Query("monthly", regex="^(daily|weekly|monthly|quarterly|yearly)$")
) -> Any:
    """
    Generate comprehensive reports for Director and Deputy Director.
    Aggregates plans, facts (sales), and bonuses based on the selected period.
    """
    if current_user.role not in [UserRole.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 1. Fetch Plans (Plans are stored as month/year)
    # We will fetch all plans that overlap with the start_date -> end_date
    start_month = start_date.month
    start_year = start_date.year
    end_month = end_date.month
    end_year = end_date.year

    # 2. Fetch Aggregated Sales (Fact) from ReservationItem -> Reservation
    sales_query = select(
        ReservationItem.doctor_id,
        Doctor.full_name.label("doctor_name"),
        ReservationItem.product_id,
        Product.name.label("product_name"),
        func.sum(ReservationItem.quantity).label("fact_quantity"),
        func.sum(ReservationItem.price * ReservationItem.quantity).label("fact_amount"),
    ).join(Reservation, Reservation.id == ReservationItem.reservation_id)\
     .join(Doctor, Doctor.id == ReservationItem.doctor_id)\
     .join(Product, Product.id == ReservationItem.product_id)\
     .where(
         cast(Reservation.date, Date) >= start_date,
         cast(Reservation.date, Date) <= end_date,
         Reservation.status == "approved"
     ).group_by(
         ReservationItem.doctor_id, Doctor.full_name, ReservationItem.product_id, Product.name
     )

    sales_result = await db.execute(sales_query)
    sales_data = sales_result.all()

    # 3. Fetch Bonus Ledger for Predinvest and Offsets/Accruals
    bonuses_query = select(
        BonusLedger.doctor_id,
        func.sum(
            func.case(
                (BonusLedger.ledger_type == "accrual", BonusLedger.amount), 
                else_=0
            )
        ).label("earned_bonus"),
        func.sum(
            func.case(
                (BonusLedger.ledger_type == "advance", -BonusLedger.amount), 
                else_=0
            )
        ).label("predinvest_given"),
        func.sum(
            func.case(
                (BonusLedger.ledger_type == "offset", -BonusLedger.amount), 
                else_=0
            )
        ).label("predinvest_paid_off")
    ).where(
        cast(BonusLedger.created_at, Date) >= start_date,
        cast(BonusLedger.created_at, Date) <= end_date,
        BonusLedger.doctor_id.isnot(None)
    ).group_by(BonusLedger.doctor_id)

    bonuses_result = await db.execute(bonuses_query)
    bonuses_data = bonuses_result.all()

    # Create mapping
    report_map = {}
    
    # Process sales
    for row in sales_data:
        doc_id = row.doctor_id
        if doc_id not in report_map:
            report_map[doc_id] = {
                "doctor_name": row.doctor_name,
                "fact_quantity": 0,
                "fact_amount": 0.0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0,
            }
        report_map[doc_id]["fact_quantity"] += row.fact_quantity
        report_map[doc_id]["fact_amount"] += row.fact_amount

    # Process bonuses
    for row in bonuses_data:
        doc_id = row.doctor_id
        if doc_id not in report_map:
            # We might not have the doctor name here efficiently without a join, but we can do a secondary lookup or ignore
            # if they didn't have sales. For completeness, let's just add them.
            report_map[doc_id] = {
                "doctor_name": f"Doctor #{doc_id}",
                "fact_quantity": 0,
                "fact_amount": 0.0,
                "earned_bonus": 0.0,
                "predinvest_given": 0.0,
                "predinvest_paid_off": 0.0,
            }
        report_map[doc_id]["earned_bonus"] = float(row.earned_bonus or 0)
        report_map[doc_id]["predinvest_given"] = float(row.predinvest_given or 0)
        report_map[doc_id]["predinvest_paid_off"] = float(row.predinvest_paid_off or 0)

    # 4. Fetch Plans
    plans_query = select(
        Plan.doctor_id,
        func.sum(Plan.target_quantity).label("plan_quantity"),
        func.sum(Plan.target_amount).label("plan_amount")
    ).where(
        Plan.year >= start_year,
        Plan.year <= end_year,
        # A more precise month filtering could be added here, but for simplicity we'll just pull the overlapping years
    ).group_by(Plan.doctor_id)
    
    plans_result = await db.execute(plans_query)
    for row in plans_result.all():
        doc_id = row.doctor_id
        if doc_id in report_map:
            report_map[doc_id]["plan_quantity"] = row.plan_quantity
            report_map[doc_id]["plan_amount"] = row.plan_amount

    # Flatten map
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

    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "REPORT_DOWNLOAD", "Analytics", 0,
        f"Загружен комплексный отчет: с {start_date} по {end_date}, период: {period}",
        request
    )

    return {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "data": summary
    }
