from typing import Any, List, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.api import deps
from app.models.sales import Invoice, InvoiceStatus
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/debtors")
async def read_debtors(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get list of unpaid/partial invoices (Debtors).
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    query = (
        select(Invoice)
        .where(Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]))
        .order_by(Invoice.date.desc())
        .offset(skip).limit(limit)
    )
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    # In a real app, we might aggregate by Customer here
    return invoices

@router.get("/stats")
async def read_global_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Global statistics: Total Sales, Total Payments, Total Debt.
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    # Total Sales (Confirmed Reservations)
    total_sales_query = select(func.sum(Reservation.total_amount)).where(Reservation.status == "confirmed")
    total_sales_result = await db.execute(total_sales_query)
    total_sales = total_sales_result.scalar() or 0.0
    
    # Total Payments
    total_payments_query = select(func.sum(Invoice.paid_amount))
    total_payments_result = await db.execute(total_payments_query)
    total_payments = total_payments_result.scalar() or 0.0
    
    # Total Debt (Unpaid Invoices)
    # Ideally: Sum(total_amount - paid_amount) where status != PAID
    # Simplification: Total Sales (Invoiced) - Total Payments
    total_debt = total_sales - total_payments # Approximate
    
    return {
        "total_sales": total_sales,
        "total_payments": total_payments,
        "total_debt": total_debt
    }

@router.get("/kpi/{user_id}")
async def read_user_kpi(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: int,
    month: int = None,
    year: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get KPI for a specific Med Rep (Plan vs Fact).
    """
    # Sum of Plans
    plan_query = select(func.sum(Plan.target_amount)).where(Plan.med_rep_id == user_id)
    if month:
        plan_query = plan_query.where(Plan.month == month)
    if year:
        plan_query = plan_query.where(Plan.year == year)
        
    plan_result = await db.execute(plan_query)
    total_plan = plan_result.scalar() or 0.0
    
    # Sum of Facts using DoctorMonthlyStat
    fact_query = select(func.sum(DoctorMonthlyStat.paid_amount)).where(
        DoctorMonthlyStat.doctor_id.in_(
            select(Doctor.id).where(Doctor.assigned_rep_id == user_id)
        )
    )
    if month:
        fact_query = fact_query.where(DoctorMonthlyStat.month == month)
    if year:
        fact_query = fact_query.where(DoctorMonthlyStat.year == year)
    
    fact_result = await db.execute(fact_query)
    total_fact = fact_result.scalar() or 0.0
    
    return {
        "user_id": user_id,
        "total_plan": total_plan,
        "total_fact": total_fact,
        "achievement_percent": (total_fact / total_plan * 100) if total_plan > 0 else 0
    }
