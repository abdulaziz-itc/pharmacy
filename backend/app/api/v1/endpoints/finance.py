from typing import Any, List, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.api import deps
from app.models.sales import Invoice, InvoiceStatus, Plan, Reservation, ReservationStatus
from app.models.user import User, UserRole
from app.models.crm import Doctor
from app.models.ledger import DoctorMonthlyStat

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
    Managers see debtors only within their sub-team.
    """
    from app.crud.crud_user import get_descendant_ids
    
    # Permission check: Director/Deputy/Orders can see global, others filtered
    is_global_manager = current_user.role in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    
    if not is_global_manager and not is_team_manager:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    query = (
        select(Invoice)
        .join(Reservation)
        .where(Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]))
        .order_by(Invoice.date.desc())
    )
    
    if is_team_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1]
        query = query.where(Reservation.created_by_id.in_(descendant_ids))
        
    result = await db.execute(query.offset(skip).limit(limit))
    invoices = result.scalars().all()
    return invoices

@router.get("/stats")
async def read_global_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Global statistics: Total Sales, Total Payments, Total Debt.
    Filtered by hierarchy for managers.
    """
    from app.crud.crud_user import get_descendant_ids
    
    is_global_manager = current_user.role in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR]
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    
    if not is_global_manager and not is_team_manager:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    descendant_ids = None
    if is_team_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1]
            
    # Total Sales (Confirmed Reservations)
    total_sales_query = select(func.sum(Reservation.total_amount)).where(Reservation.status == ReservationStatus.APPROVED)
    if is_team_manager:
        total_sales_query = total_sales_query.where(Reservation.created_by_id.in_(descendant_ids))
    total_sales_result = await db.execute(total_sales_query)
    total_sales = total_sales_result.scalar() or 0.0
    
    # Total Payments
    total_payments_query = select(func.sum(Invoice.paid_amount)).join(Reservation)
    if is_team_manager:
        total_payments_query = total_payments_query.where(Reservation.created_by_id.in_(descendant_ids))
    total_payments_result = await db.execute(total_payments_query)
    total_payments = total_payments_result.scalar() or 0.0
    
    total_debt = total_sales - total_payments
    
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
