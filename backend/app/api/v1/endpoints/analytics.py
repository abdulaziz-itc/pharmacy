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
    if current_user.role not in [
        UserRole.DIRECTOR, 
        UserRole.DEPUTY_DIRECTOR, 
        UserRole.PRODUCT_MANAGER, 
        UserRole.FIELD_FORCE_MANAGER, 
        UserRole.REGIONAL_MANAGER
    ]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not month:
        month = datetime.utcnow().month
    if not year:
        year = datetime.utcnow().year
        
    query = select(
        func.sum(DoctorMonthlyStat.paid_amount).label('total_revenue'),
        func.sum(DoctorMonthlyStat.bonus_amount).label('total_bonus_accrued'),
        func.sum(DoctorMonthlyStat.paid_quantity).label('total_items_sold')
    )
    
    if current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]:
        from app.crud.crud_user import get_descendant_ids
        from app.models.crm import Doctor
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids:
            rep_ids = [-1]
        
        query = query.join(Doctor, Doctor.id == DoctorMonthlyStat.doctor_id).where(
            Doctor.assigned_rep_id.in_(rep_ids)
        )
        
    query = query.where(
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
