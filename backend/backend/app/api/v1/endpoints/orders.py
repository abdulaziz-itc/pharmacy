from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
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
    request: Request,
) -> Any:
    """
    Creates a reservation with strictly locked Row-Level Inventory Stock Deduction.
    """
    if current_user.role not in [UserRole.HEAD_OF_ORDERS, UserRole.MED_REP]:
        raise HTTPException(status_code=403, detail="Not enough permissions to book reservations.")
        
    reservation = await ReservationService.create_reservation_with_stock_lock(
        db=db, 
        obj_in=reservation_in, 
        user_id=current_user.id
    )
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Reservation", reservation.id,
        f"Бронь создана (Склад зарезервирован): ID {reservation.id}",
        request
    )
    return reservation
