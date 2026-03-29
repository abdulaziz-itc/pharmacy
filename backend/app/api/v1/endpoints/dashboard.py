from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, literal
from datetime import datetime, timedelta

from app.api import deps
from app.models.sales import Reservation, ReservationStatus, Invoice, InvoiceStatus, Plan
from app.models.crm import MedicalOrganization, Doctor, Notification, Region, user_regions
from app.models.visit import Visit, VisitPlan
from app.models.ledger import BonusLedger
from app.models.user import UserRole
from app.crud.crud_user import get_descendant_ids
from app.schemas.dashboard import DashboardStats, ActivityItem, RevenueForecastPoint

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
    region_id: int = None,
) -> Any:
    # 0. Role Definition
    # Global roles see aggregate data for the entire company
    is_global = current_user.role in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.INVESTOR, UserRole.ADMIN, UserRole.HRD]
    # Management roles see data for their descendants
    is_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.HEAD_OF_ORDERS]
    # MedRep roles see only their own data
    is_med_rep = current_user.role == UserRole.MED_REP
    
    # Regional Filtering
    allowed_region_ids = None
    if current_user.role == UserRole.REGIONAL_MANAGER:
        try:
            allowed_region_ids = [r.id for r in current_user.assigned_regions]
        except Exception:
            # Fallback if relationship not loaded
            stmt = select(Region.id).join(user_regions, Region.id == user_regions.c.region_id).where(user_regions.c.user_id == current_user.id)
            res = await db.execute(stmt)
            allowed_region_ids = res.scalars().all()
            
        if region_id and region_id not in allowed_region_ids:
            # If RM tries to filter outside their scope, return 0 by using invalid ID
            region_id = -1 
    
    final_region_ids = [region_id] if region_id else allowed_region_ids
    
    # Hierarchy Mapping
    descendant_ids = None
    if is_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1] 

    # 1. Total Sales (Approved Reservations)
    total_sales_query = select(func.sum(Reservation.total_amount)).where(Reservation.status == ReservationStatus.APPROVED)
    if is_med_rep:
        total_sales_query = total_sales_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        total_sales_query = total_sales_query.where(Reservation.created_by_id.in_(descendant_ids))
    
    if final_region_ids:
        total_sales_query = total_sales_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    total_sales_res = await db.execute(total_sales_query)
    total_sales = total_sales_res.scalar() or 0.0

    # 2. Active Doctors
    active_doctors_query = select(func.count(Doctor.id)).where(Doctor.is_active == True)
    if is_med_rep:
        active_doctors_query = active_doctors_query.where(Doctor.assigned_rep_id == current_user.id)
    elif is_manager:
        active_doctors_query = active_doctors_query.where(Doctor.assigned_rep_id.in_(descendant_ids))
    
    if final_region_ids:
        active_doctors_query = active_doctors_query.where(Doctor.region_id.in_(final_region_ids))
        
    active_doctors_res = await db.execute(active_doctors_query)
    active_doctors = active_doctors_res.scalar() or 0

    # 3. Pending Reservations (Broni)
    pending_res_query = select(func.count(Reservation.id)).where(Reservation.status == ReservationStatus.PENDING)
    if is_med_rep:
        pending_res_query = pending_res_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        pending_res_query = pending_res_query.where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        pending_res_query = pending_res_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    pending_res_result = await db.execute(pending_res_query)
    pending_reservations = pending_res_result.scalar() or 0

    # 4. Total Debt (Unpaid/Partial Invoices)
    # FIX: Explicit onclause to avoid AmbiguousForeignKeysError
    total_debt_query = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).join(
        Reservation, Invoice.reservation_id == Reservation.id
    ).where(
        Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL])
    )
    if is_med_rep:
        total_debt_query = total_debt_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        total_debt_query = total_debt_query.where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        total_debt_query = total_debt_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    total_debt_result = await db.execute(total_debt_query)
    total_debt = total_debt_result.scalar() or 0.0

    # 5. Recent Activities
    recent_activities = []
    
    # Notifications
    notif_query = select(Notification).where(Notification.recipient_id == current_user.id).order_by(desc(Notification.created_at)).limit(5)
    notif_result = await db.execute(notif_query)
    notifications = notif_result.scalars().all()
    
    for n in notifications:
        recent_activities.append(ActivityItem(
            title=n.topic or "Notification",
            desc=n.message or "",
            amount="Обзор",
            time="Неadвно",
            color="rose" if n.message and "запаc" in n.message.lower() else "blue"
        ))

    # Reservations
    res_query = select(Reservation).order_by(desc(Reservation.date)).limit(10)
    if is_med_rep:
        res_query = res_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        res_query = res_query.where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        res_query = res_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    res_result = await db.execute(res_query)
    reservations_data = res_result.scalars().all()
    
    for r in reservations_data:
        recent_activities.append(ActivityItem(
            title=r.customer_name or "Unknown",
            desc=f"Заказ на сумму {r.total_amount:,.0f} сум",
            amount=f"+{r.total_amount:,.0f} сум",
            time="Сегодня",
            color="green" if r.status == ReservationStatus.APPROVED else "orange"
        ))

    recent_activities = recent_activities[:4] if recent_activities else [
        ActivityItem(title="Нет событий", desc="За последнее время событий не зафиксировано", amount="", time="", color="blue")
    ]

    # 6. Revenue Forecast (Mocked for now as per web dashboards)
    forecast = [
        RevenueForecastPoint(month="Янв", value=15.0),
        RevenueForecastPoint(month="Фев", value=22.0),
        RevenueForecastPoint(month="Мар", value=35.0),
        RevenueForecastPoint(month="Апр", value=28.0),
        RevenueForecastPoint(month="Май", value=42.0),
        RevenueForecastPoint(month="Июн", value=38.0),
    ]

    # 7. Visit Stats
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    
    planned_visits_query = select(func.count(VisitPlan.id)).where(VisitPlan.planned_date >= month_start)
    completed_visits_query = select(func.count(VisitPlan.id)).where(
        (VisitPlan.status == "completed") &
        (VisitPlan.planned_date >= month_start)
    )
    
    if is_med_rep:
        planned_visits_query = planned_visits_query.where(VisitPlan.med_rep_id == current_user.id)
        completed_visits_query = completed_visits_query.where(VisitPlan.med_rep_id == current_user.id)
    elif is_manager:
        planned_visits_query = planned_visits_query.where(VisitPlan.med_rep_id.in_(descendant_ids))
        completed_visits_query = completed_visits_query.where(VisitPlan.med_rep_id.in_(descendant_ids))
    
    planned_visits_res = await db.execute(planned_visits_query)
    planned_visits = planned_visits_res.scalar() or 0

    completed_visits_res = await db.execute(completed_visits_query)
    completed_visits = completed_visits_res.scalar() or 0

    # 8. Bonus Balance
    # Web matches this with personal/team ledger sums
    bonus_balance_query = select(func.sum(BonusLedger.amount))
    if is_med_rep:
        bonus_balance_query = bonus_balance_query.where(BonusLedger.user_id == current_user.id)
    elif is_manager:
        bonus_balance_query = bonus_balance_query.where(BonusLedger.user_id.in_(descendant_ids))
    else:
        # For directors, maybe show total? Or 0 if they don't earn bonuses
        pass 
            
    bonus_balance_res = await db.execute(bonus_balance_query)
    bonus_balance = bonus_balance_res.scalar() or 0.0

    return {
        "total_sales": total_sales,
        "total_sales_change": "+12.5%", # Hardcoded for now
        "active_doctors": active_doctors,
        "active_doctors_change": "+2.3%",
        "pending_reservations": pending_reservations,
        "pending_reservations_label": "Ожидают",
        "total_debt": total_debt,
        "total_debt_change": "-4.1%",
        "revenue_forecast": forecast,
        "recent_activities": recent_activities,
        "growth_peak": "+22.4%",
        "completed_visits": completed_visits,
        "planned_visits": planned_visits,
        "bonus_balance": bonus_balance
    }
