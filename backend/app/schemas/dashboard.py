from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class ActivityItem(BaseModel):
    title: str
    desc: str
    amount: str
    time: str
    color: str

class RevenueForecastPoint(BaseModel):
    month: str
    value: float

class DashboardStats(BaseModel):
    total_sales: float
    total_sales_change: str
    active_doctors: int
    active_doctors_change: str
    pending_reservations: int
    pending_reservations_label: str
    total_debt: float
    total_debt_change: str
    revenue_forecast: List[RevenueForecastPoint]
    recent_activities: List[ActivityItem]
    growth_peak: str

    class Config:
        from_attributes = True
