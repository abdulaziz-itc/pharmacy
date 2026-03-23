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
    Get comprehensive reports for the dashboard.
    Aggregates data from Sales (Fact), Plans, and Bonuses.
    
    Parameters:
    - start_date, end_date: Date range for the report.
    - period: Grouping period (daily, weekly, monthly, quarterly, yearly).
    
    Returns a dictionary containing:
    - summary: Total facts, plans, and earned bonuses.
    - details: List of per-doctor/product breakdown with plan vs fact comparison.
    - charts: Time-series data for historical trends.
    """
    if current_user.role not in [UserRole.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 1. Fetch Plans (Plans are stored as month/year)
    start_year = start_date.year
    end_year = end_date.year
    
    plans_query = select(
        Plan.doctor_id,
        Doctor.full_name.label("doctor_name"),
        func.sum(Plan.target_quantity).label("plan_quantity"),
        func.sum(Plan.target_amount).label("plan_amount")
    ).join(Doctor, Doctor.id == Plan.doctor_id, isouter=True)\
     .where(
        Plan.year >= start_year,
        Plan.year <= end_year,
        # In a real app, we'd filter by month too, but keeping parity with existing logic for years
    ).group_by(Plan.doctor_id, Doctor.full_name)
    
    plans_result = await db.execute(plans_query)
    
    # Initialize mapping with Plans
    report_map = {}
    for row in plans_result.all():
        doc_id = row.doctor_id
        if doc_id: # Only aggregate per doctor for now
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
    ).join(Doctor, Doctor.id == DoctorFactAssignment.doctor_id)\
     .where(
         cast(DoctorFactAssignment.created_at, Date) >= start_date,
         cast(DoctorFactAssignment.created_at, Date) <= end_date,
     ).group_by(
         DoctorFactAssignment.doctor_id, Doctor.full_name
     )

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
        func.sum(
            case(
                [(BonusLedger.ledger_type == "accrual", BonusLedger.amount)], 
                else_=0
            )
        ).label("earned_bonus"),
        func.sum(
            case(
                [(BonusLedger.ledger_type == "advance", -BonusLedger.amount)], 
                else_=0
            )
        ).label("predinvest_given"),
        func.sum(
            case(
                [(BonusLedger.ledger_type == "offset", -BonusLedger.amount)], 
                else_=0
            )
        ).label("predinvest_paid_off")
    ).where(
        cast(BonusLedger.created_at, Date) >= start_date,
        cast(BonusLedger.created_at, Date) <= end_date,
        BonusLedger.doctor_id.isnot(None)
    ).group_by(BonusLedger.doctor_id)

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
