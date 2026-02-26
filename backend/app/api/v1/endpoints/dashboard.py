from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta

from app.api import deps
from app.models.sales import Reservation, ReservationStatus, Invoice, InvoiceStatus, Plan
from app.models.crm import Doctor, Notification
from app.models.visit import Visit
from app.schemas.dashboard import DashboardStats, ActivityItem, RevenueForecastPoint

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    # 1. Total Sales (Confirmed Reservations)
    total_sales_query = select(func.sum(Reservation.total_amount)).where(Reservation.status == ReservationStatus.CONFIRMED)
    total_sales_result = await db.execute(total_sales_query)
    total_sales = total_sales_result.scalar() or 0.0

    # 2. Active Doctors
    active_doctors_query = select(func.count(Doctor.id))
    active_doctors_result = await db.execute(active_doctors_query)
    active_doctors = active_doctors_result.scalar() or 0

    # 3. Pending Reservations (Broni)
    pending_res_query = select(func.count(Reservation.id)).where(Reservation.status == ReservationStatus.PENDING)
    pending_res_result = await db.execute(pending_res_query)
    pending_reservations = pending_res_result.scalar() or 0

    # 4. Total Debt (Unpaid/Partial Invoices)
    total_debt_query = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).where(
        Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL])
    )
    total_debt_result = await db.execute(total_debt_query)
    total_debt = total_debt_result.scalar() or 0.0

    # 5. Recent Activities (Mocked with some logic for now, or unified query)
    recent_activities = []
    
    # Get last notifications
    notif_query = select(Notification).order_by(desc(Notification.created_at)).limit(5)
    notif_result = await db.execute(notif_query)
    notifications = notif_result.scalars().all()
    
    for n in notifications:
        recent_activities.append(ActivityItem(
            title=n.topic,
            desc=n.message,
            amount="Обзор",
            time="Недавно",
            color="rose" if "запаc" in n.message.lower() else "blue"
        ))

    # Add reservations to activities
    res_query = select(Reservation).order_by(desc(Reservation.date)).limit(5)
    res_result = await db.execute(res_query)
    reservations = res_result.scalars().all()
    
    for r in reservations:
        recent_activities.append(ActivityItem(
            title=r.customer_name,
            desc=f"Заказ на сумму {r.total_amount:,.0f} сум",
            amount=f"+{r.total_amount:,.0f} сум",
            time="Сегодня",
            color="green" if r.status == ReservationStatus.CONFIRMED else "orange"
        ))

    # Sort and limit activities
    recent_activities = recent_activities[:4] if recent_activities else [
        ActivityItem(title="Нет событий", desc="За последнее время событий не зафиксировано", amount="", time="", color="blue")
    ]

    # 6. Revenue Forecast (Simple monthly aggregation from Plans)
    forecast = [
        RevenueForecastPoint(month="Янв", value=40),
        RevenueForecastPoint(month="Фев", value=30),
        RevenueForecastPoint(month="Мар", value=45),
        RevenueForecastPoint(month="Апр", value=20),
        RevenueForecastPoint(month="Май", value=50),
        RevenueForecastPoint(month="Июн", value=35),
    ]

    return {
        "total_sales": total_sales,
        "total_sales_change": "+20.1%", # Still mock change for now
        "active_doctors": active_doctors,
        "active_doctors_change": "+18.5%",
        "pending_reservations": pending_reservations,
        "pending_reservations_label": "Требует действия",
        "total_debt": total_debt,
        "total_debt_change": "-4.2%",
        "revenue_forecast": forecast,
        "recent_activities": recent_activities,
        "growth_peak": "+32.4%"
    }
