from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, literal, case, inspect
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.api import deps
from app.models.sales import Reservation, ReservationStatus, Invoice, InvoiceStatus, Plan, DoctorFactAssignment
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
    year: int = None,
    month: int = None,
) -> Any:
    # 0. Time Range Definition
    is_global_mode = not year or not month
    
    month_start = None
    month_end = None
    
    if not is_global_mode:
        import calendar
        month_start = datetime(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        month_end = datetime(year, month, last_day, 23, 59, 59)

    # 0.1 Role Definition
    is_global = current_user.role in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.INVESTOR, UserRole.ADMIN, UserRole.HRD]
    is_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.HEAD_OF_ORDERS]
    is_med_rep = current_user.role == UserRole.MED_REP
    
    # Regional Filtering
    allowed_region_ids = None
    if current_user.role == UserRole.REGIONAL_MANAGER:
        try:
            allowed_region_ids = [r.id for r in current_user.assigned_regions]
        except Exception:
            stmt = select(Region.id).join(user_regions, Region.id == user_regions.c.region_id).where(user_regions.c.user_id == current_user.id)
            res = await db.execute(stmt)
            allowed_region_ids = res.scalars().all()
            
        if region_id and region_id not in allowed_region_ids:
            region_id = -1 
    
    final_region_ids = [region_id] if region_id else allowed_region_ids
    
    # Hierarchy Mapping
    descendant_ids = None
    if is_manager:
        descendant_ids = await get_descendant_ids(db, current_user.id)
        if not descendant_ids:
            descendant_ids = [-1] 

    # --- 0.2 Metric Initialization ---
    total_sales = 0.0
    active_doctors = 0
    pending_reservations = 0
    total_debt = 0.0
    completed_visits = 0
    planned_visits = 0
    bonus_balance = 0.0

    # --- 0.3 HRD Logic (Personnel over Financials) ---
    if current_user.role == UserRole.HRD:
        from app.models.user import User, UserLoginHistory
        
        # 1. Total Staff (All active users)
        staff_query = select(func.count(User.id)).where(User.is_active == True)
        staff_res = await db.execute(staff_query)
        total_staff = staff_res.scalar() or 0
        
        # 2. Doctor Coverage (All active doctors)
        doc_query = select(func.count(Doctor.id)).where(Doctor.is_active == True)
        if final_region_ids:
            doc_query = doc_query.where(Doctor.region_id.in_(final_region_ids))
        doc_res = await db.execute(doc_query)
        active_doctors = doc_res.scalar() or 0
        
        # 3. Active Users Today (Unique logins in last 24h)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        active_users_query = select(func.count(func.distinct(UserLoginHistory.user_id))).where(UserLoginHistory.login_at >= today_start)
        active_users_res = await db.execute(active_users_query)
        active_users_today = active_users_res.scalar() or 0
        
        # 4. Completed Visits
        comp_visits_query = select(func.count(VisitPlan.id)).where(VisitPlan.status == "completed")
        if not is_global_mode:
            comp_visits_query = comp_visits_query.where(
                (VisitPlan.planned_date >= month_start.date()) &
                (VisitPlan.planned_date <= month_end.date())
            )
        if final_region_ids:
            from app.models.crm import MedicalOrganization
            comp_visits_query = comp_visits_query.join(MedicalOrganization, VisitPlan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
            
        comp_visits_res = await db.execute(comp_visits_query)
        completed_visits = comp_visits_res.scalar() or 0

        # HRD simplified Activities (Logins)
        recent_logins_query = select(UserLoginHistory).join(User).options(selectinload(UserLoginHistory.user)).order_by(desc(UserLoginHistory.login_at)).limit(5)
        recent_logins_res = await db.execute(recent_logins_query)
        logins = recent_logins_res.scalars().all()
        
        recent_activities = []
        for l in logins:
            recent_activities.append(ActivityItem(
                title=l.user.full_name if l.user else "User",
                desc=f"Вход в систему ({l.ip_address or 'Unknown IP'})",
                amount="Вход",
                time=l.login_at.strftime("%d.%m %H:%M"),
                color="blue"
            ))

        return {
            "total_sales": float(total_staff), # Mapping staff count to total_sales field
            "total_sales_change": "+2.1%", # Retention/Growth placeholder
            "active_doctors": active_doctors,
            "active_doctors_change": "+1.5%",
            "pending_reservations": active_users_today, # Mapping active users today
            "pending_reservations_label": "АКТYВНОСТЬ (24ч)",
            "total_debt": float(completed_visits), # Mapping visits to total_debt field
            "total_debt_change": "Выполнено",
            "revenue_forecast": [],
            "recent_activities": recent_activities,
            "growth_peak": "100%",
            "completed_visits": completed_visits,
            "planned_visits": 0,
            "bonus_balance": 0.0
        }

    # --- 0.4 KPIs CALCULATION ---
    
    # 1. Total Sales (Realized Invoices)
    sales_query = select(func.sum(Invoice.total_amount)).where(
        Invoice.status != InvoiceStatus.CANCELLED
    )
    if not is_global_mode:
        sales_query = sales_query.where(
            (Invoice.date >= month_start) &
            (Invoice.date <= month_end)
        )
    if is_med_rep:
        sales_query = sales_query.join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        sales_query = sales_query.join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id.in_(descendant_ids))
    
    if final_region_ids:
        # Robustly join Reservation and MedicalOrganization if not already joined
        # Checking if Reservation is already in the query's select or join entities
        if Reservation not in sales_query._setup_joins: 
             sales_query = sales_query.join(Reservation, Invoice.reservation_id == Reservation.id)
        sales_query = sales_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    
    sales_res = await db.execute(sales_query)
    total_sales = sales_res.scalar() or 0.0

    # 2. Total Debt (Cumulative unpaid amount)
    debt_query = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).where(
        (Invoice.status != InvoiceStatus.CANCELLED) &
        (Invoice.paid_amount < Invoice.total_amount)
    )
    if is_med_rep:
        debt_query = debt_query.join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        debt_query = debt_query.join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        if Reservation not in debt_query._setup_joins: 
            debt_query = debt_query.join(Reservation, Invoice.reservation_id == Reservation.id)
        debt_query = debt_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    
    debt_res = await db.execute(debt_query)
    total_debt = debt_res.scalar() or 0.0

    # 3. Active Doctors
    active_docs_res_stmt = select(func.distinct(DoctorFactAssignment.doctor_id))
    active_docs_visit_stmt = select(func.distinct(VisitPlan.doctor_id))
    
    if not is_global_mode:
        active_docs_res_stmt = active_docs_res_stmt.where(
            (DoctorFactAssignment.month == month) &
            (DoctorFactAssignment.year == year)
        )
        active_docs_visit_stmt = active_docs_visit_stmt.where(
            (VisitPlan.planned_date >= month_start.date()) &
            (VisitPlan.planned_date <= month_end.date())
        )
    
    if is_med_rep:
        active_docs_res_stmt = active_docs_res_stmt.where(DoctorFactAssignment.med_rep_id == current_user.id)
        active_docs_visit_stmt = active_docs_visit_stmt.where(VisitPlan.med_rep_id == current_user.id)
    elif is_manager:
        active_docs_res_stmt = active_docs_res_stmt.where(DoctorFactAssignment.med_rep_id.in_(descendant_ids))
        active_docs_visit_stmt = active_docs_visit_stmt.where(VisitPlan.med_rep_id.in_(descendant_ids))
        
    if final_region_ids:
        active_docs_res_stmt = active_docs_res_stmt.join(Doctor, DoctorFactAssignment.doctor_id == Doctor.id).where(Doctor.region_id.in_(final_region_ids))
        active_docs_visit_stmt = active_docs_visit_stmt.join(Doctor, VisitPlan.doctor_id == Doctor.id).where(Doctor.region_id.in_(final_region_ids))

    res_docs = await db.execute(active_docs_res_stmt)
    visit_docs = await db.execute(active_docs_visit_stmt)
    
    # Actually counting DOCTORS as unique individuals
    unique_doctor_ids = set(res_docs.scalars().all()) | set(visit_docs.scalars().all())
    active_doctors = len(unique_doctor_ids)

    # 4. Pending Reservations
    pending_res_query = select(func.count(Reservation.id)).where(
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.DRAFT])
    )
    if is_med_rep:
        pending_res_query = pending_res_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        pending_res_query = pending_res_query.where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        pending_res_query = pending_res_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    
    pending_res_res = await db.execute(pending_res_query)
    pending_reservations = pending_res_res.scalar() or 0

    # 5. Recent Activities (Filter by month)
    recent_activities = []
    
    # Notifications
    notif_query = select(Notification).where(Notification.recipient_id == current_user.id)
    if not is_global_mode:
        notif_query = notif_query.where(
            (Notification.created_at >= month_start) &
            (Notification.created_at <= month_end)
        )
    notif_query = notif_query.order_by(desc(Notification.created_at)).limit(5)
    notif_result = await db.execute(notif_query)
    notifications = notif_result.scalars().all()
    
    for n in notifications:
        recent_activities.append(ActivityItem(
            title=n.topic or "Notification",
            desc=n.message or "",
            amount="Обзор",
            time=n.created_at.strftime("%d.%m %H:%M"),
            color="rose" if n.message and "запаc" in n.message.lower() else "blue"
        ))

    # Reservations
    res_query = select(Reservation)
    if not is_global_mode:
        res_query = res_query.where(
            (Reservation.date >= month_start.date()) &
            (Reservation.date <= month_end.date())
        )
    res_query = res_query.order_by(desc(Reservation.date)).limit(10)
    
    if is_med_rep:
        res_query = res_query.where(Reservation.created_by_id == current_user.id)
    elif is_manager:
        res_query = res_query.where(Reservation.created_by_id.in_(descendant_ids))
        
    if final_region_ids:
        # Check if already joined via subquery or manual join
        res_query = res_query.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
        
    res_result = await db.execute(res_query)
    reservations_data = res_result.scalars().all()
    
    for r in reservations_data:
        recent_activities.append(ActivityItem(
            title=r.customer_name or "Unknown",
            desc=f"Заказ на сумму {r.total_amount:,.0f} сум",
            amount=f"+{r.total_amount:,.0f} сум",
            time=r.date.strftime("%d.%m"),
            color="green" if r.status == ReservationStatus.APPROVED else "orange"
        ))

    recent_activities = recent_activities[:5] if recent_activities else [
        ActivityItem(title="Нет событий", desc="За это время событий не зафиксировано", amount="", time="", color="blue")
    ]

    # 6. Revenue Forecast
    months_list = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    forecast = []
    current_m = month or datetime.utcnow().month
    for i in range(-2, 4):
        m_idx = (current_m - 1 + i) % 12
        forecast.append(RevenueForecastPoint(month=months_list[m_idx], value=20.0 + (i * 5) + (current_m % 5)))

    # 7. Visit Stats
    planned_visits_query = select(func.count(VisitPlan.id))
    completed_visits_query = select(func.count(VisitPlan.id)).where(VisitPlan.status == "completed")
    
    if not is_global_mode:
        planned_visits_query = planned_visits_query.where(
            (VisitPlan.planned_date >= month_start.date()) &
            (VisitPlan.planned_date <= month_end.date())
        )
        completed_visits_query = completed_visits_query.where(
            (VisitPlan.planned_date >= month_start.date()) &
            (VisitPlan.planned_date <= month_end.date())
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
    bonus_balance_query = select(func.sum(BonusLedger.amount))
    if not is_global_mode:
        bonus_balance_query = bonus_balance_query.where(
            (BonusLedger.created_at >= month_start) &
            (BonusLedger.created_at <= month_end)
        )
    if is_med_rep:
        bonus_balance_query = bonus_balance_query.where(BonusLedger.user_id == current_user.id)
    elif is_manager:
        bonus_balance_query = bonus_balance_query.where(BonusLedger.user_id.in_(descendant_ids))
            
    bonus_balance_res = await db.execute(bonus_balance_query)
    bonus_balance = bonus_balance_res.scalar() or 0.0

    return {
        "total_sales": total_sales,
        "total_sales_change": "+12.5%",
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
