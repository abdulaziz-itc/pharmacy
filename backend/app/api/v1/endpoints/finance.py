from typing import Any, List, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text

from app.api import deps
from app.models.sales import Invoice, InvoiceStatus, Plan, Reservation, ReservationStatus
from app.models.user import User, UserRole
from app.models.crm import Doctor
from app.models.ledger import DoctorMonthlyStat
from app.schemas.finance import ExpenseCategory, ExpenseCategoryCreate, OtherExpense, OtherExpenseCreate
from app.services.expense_service import ExpenseService
from app.services.audit_service import log_action

router = APIRouter()

@router.get("/debtors")
async def read_debtors(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
    region_id: int = None
) -> Any:
    """
    Get list of unpaid/partial invoices (Debtors).
    Managers see debtors only within their sub-team and regions.
    """
    from app.crud.crud_user import get_descendant_ids
    from app.models.crm import MedicalOrganization
    
    # Permission check: Director/Deputy/Orders can see global, others filtered
    is_global_manager = current_user.role in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    
    if not is_global_manager and not is_team_manager:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    query = (
        select(Invoice)
        .join(Reservation, Invoice.reservation_id == Reservation.id)
        .where(Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]))
        .order_by(Invoice.date.desc())
    )
    
    # Regional Restriction for RM
    final_region_ids = [r.id for r in current_user.assigned_regions] if current_user.assigned_regions else None
    if current_user.role == UserRole.REGIONAL_MANAGER:
        if region_id:
            if region_id in (final_region_ids or []):
                final_region_ids = [region_id]
            else:
                final_region_ids = [-1]
    elif region_id:
        final_region_ids = [region_id]

    if is_team_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1]
        query = query.where(Reservation.created_by_id.in_(descendant_ids))
    
    if final_region_ids:
        query = query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    result = await db.execute(query.offset(skip).limit(limit))
    invoices = result.scalars().all()
    return invoices

@router.get("/stats")
async def read_global_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    region_id: int = None
) -> Any:
    """
    Global statistics: Total Sales, Total Payments, Total Debt.
    Filtered by hierarchy and region for managers.
    """
    from app.crud.crud_user import get_descendant_ids
    from app.models.crm import MedicalOrganization
    
    is_global_manager = current_user.role in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR]
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    
    if not is_global_manager and not is_team_manager:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    # Regional Restriction for RM
    final_region_ids = [r.id for r in current_user.assigned_regions] if current_user.assigned_regions else None
    if current_user.role == UserRole.REGIONAL_MANAGER:
        if region_id:
            if region_id in (final_region_ids or []):
                final_region_ids = [region_id]
            else:
                final_region_ids = [-1]
    elif region_id:
        final_region_ids = [region_id]

    descendant_ids = None
    if is_team_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1]
            
    # Total Sales (Confirmed Reservations)
    total_sales_query = select(func.sum(Reservation.total_amount)).where(Reservation.status == ReservationStatus.APPROVED)
    if is_team_manager:
        total_sales_query = total_sales_query.where(Reservation.created_by_id.in_(descendant_ids))
    if final_region_ids:
        total_sales_query = total_sales_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    total_sales_result = await db.execute(total_sales_query)
    total_sales = total_sales_result.scalar() or 0.0
    
    # Total Payments
    total_payments_query = select(func.sum(Invoice.paid_amount)).join(Reservation, Invoice.reservation_id == Reservation.id)
    if is_team_manager:
        total_payments_query = total_payments_query.where(Reservation.created_by_id.in_(descendant_ids))
    if final_region_ids:
        total_payments_query = total_payments_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
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

@router.get("/categories", response_model=List[ExpenseCategory])
async def get_categories(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await ExpenseService.get_categories(db)

@router.post("/categories", response_model=ExpenseCategory)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: ExpenseCategoryCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ACCOUNTANT]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await ExpenseService.create_category(db, obj_in)

@router.get("/expenses", response_model=List[OtherExpense])
async def get_expenses(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    if current_user.role not in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ACCOUNTANT]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await ExpenseService.get_expenses(db, skip, limit)

@router.post("/expenses", response_model=OtherExpense)
async def create_expense(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: OtherExpenseCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ACCOUNTANT]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await ExpenseService.create_expense(db, obj_in, current_user.id)

@router.delete("/expenses/{id}")
async def delete_expense(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ACCOUNTANT]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    expense = await ExpenseService.delete_expense(db, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Log the action for the director
    await log_action(
        db,
        current_user=current_user,
        action="DELETE_EXPENSE",
        entity_type="OtherExpense",
        entity_id=id,
        description=f'O\'chirildi: {expense.amount:,.0f} UZS (Kategoriya: {expense.category.name if expense.category else "Noma\'lum"}). Izoh: {expense.comment or "yo\'q"}'
    )
    
@router.get("/research-tx-427")
async def research_tx_427(
    secret_key: str = None,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Temporary diagnostic endpoint for transaction #427.
    """
    if secret_key != "AG_RESEARCH_ACCESS_2026":
        raise HTTPException(status_code=403, detail="Access denied")
        
    # 1. Search Audit Log
    res = await db.execute(text("SELECT * FROM audit_log WHERE target_id = 427 AND target_type = 'BalanceTransaction'"))
    audit = [dict(r._mapping) for r in res.all()]
    
    # 2. Search Orphans (April 21, 17:19:01)
    # Using a 10-minute window for safety
    p_res = await db.execute(text("SELECT * FROM payment WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
    payments = [dict(r._mapping) for r in p_res.all()]
    
    b_res = await db.execute(text("SELECT * FROM bonusledger WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
    bonuses = [dict(r._mapping) for r in b_res.all()]
    
    return {
        "audit_logs": audit,
        "orphaned_payments": payments,
        "orphaned_bonuses": bonuses
    }
