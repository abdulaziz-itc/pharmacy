from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.models.user import User, UserRole
from app.schemas.sales import Reservation, ReservationCreate, ReservationUpdate
from app.services.reservation_service import ReservationService

router = APIRouter()

@router.post("/reservations/", response_model=Reservation)
async def create_reservation_endpoint(
    *,
    db: AsyncSession = Depends(deps.get_db),
    reservation_in: ReservationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Creates a reservation with strictly locked Row-Level Inventory Stock Deduction.
    """
    if current_user.role not in [UserRole.HEAD_OF_ORDERS, UserRole.MED_REP]:
        raise HTTPException(status_code=403, detail="Not enough permissions to book reservations.")
        
    return await ReservationService.create_reservation_with_stock_lock(
        db=db, 
        obj_in=reservation_in, 
        user_id=current_user.id
    )
