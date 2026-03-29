from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta

from app.api import deps
from app.models.sales import Reservation, ReservationStatus, Invoice, InvoiceStatus, Plan
from app.models.crm import Doctor, Notification
from app.models.visit import Visit, VisitPlan
from app.models.ledger import BonusLedger
from app.schemas.dashboard import DashboardStats, ActivityItem, RevenueForecastPoint

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
    region_id: int = None,
) -> Any:
    # MOCK DATA FOR DEBUGGING
    return {
        "total_sales": 150000000.0,
        "total_sales_change": "+12%",
        "active_doctors": 45,
        "active_doctors_change": "+5%",
        "pending_reservations": 12,
        "pending_reservations_label": "Mocked",
        "total_debt": 25000000.0,
        "total_debt_change": "-2%",
        "revenue_forecast": [
            RevenueForecastPoint(month="Jan", value=20.0),
            RevenueForecastPoint(month="Feb", value=30.0),
        ],
        "recent_activities": [
            ActivityItem(title="Mock Activity", desc="Debug mode", amount="0", time="now", color="blue")
        ],
        "growth_peak": "+10%",
        "completed_visits": 10,
        "planned_visits": 20,
        "bonus_balance": 500000.0
    }
