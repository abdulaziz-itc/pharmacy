from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api import deps
from app.models.user import User, UserRole
from app.models.ledger import DoctorMonthlyStat
from datetime import datetime

router = APIRouter()

@router.get("/dashboard/global")
async def get_global_realtime_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    month: int = None,
    year: int = None
) -> Any:
    """
    Returns real-time O(1) aggregated global statistics without heavy joins.
    """
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not month:
        month = datetime.utcnow().month
    if not year:
        year = datetime.utcnow().year
        
    query = select(
        func.sum(DoctorMonthlyStat.paid_amount).label('total_revenue'),
        func.sum(DoctorMonthlyStat.bonus_amount).label('total_bonus_accrued'),
        func.sum(DoctorMonthlyStat.paid_quantity).label('total_items_sold')
    ).where(
        (DoctorMonthlyStat.month == month) &
        (DoctorMonthlyStat.year == year)
    )
    
    result = await db.execute(query)
    stats = result.first()
    
    return {
        "month": month,
        "year": year,
        "total_revenue": stats.total_revenue or 0.0,
        "total_bonus_accrued": stats.total_bonus_accrued or 0.0,
        "total_items_sold": stats.total_items_sold or 0,
    }
