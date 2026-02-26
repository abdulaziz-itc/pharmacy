from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_sales
from app.models.user import User, UserRole
from app.schemas.sales import (
    Plan, PlanCreate, 
    Reservation, ReservationCreate, ReservationUpdate,
    Invoice, Payment, PaymentCreate,
    DoctorFactAssignment, DoctorFactAssignmentCreate, SaleFact,
    BonusPayment, BonusPaymentCreate, BonusPaymentUpdate
)

router = APIRouter()

# Plans
@router.post("/plans/", response_model=Plan)
async def create_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    plan_in: PlanCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.create_plan(db, obj_in=plan_in)

@router.get("/plans/", response_model=List[Plan])
async def read_plans(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    month: int = None,
    year: int = None,
    med_rep_id: int = None,
    doctor_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_plans(db, skip=skip, limit=limit, month=month, year=year, med_rep_id=med_rep_id, doctor_id=doctor_id)

@router.put("/plans/{id}", response_model=Plan)
async def update_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    plan_in: dict,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    plan = await crud_sales.get_plan(db, id=id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Optional: check permissions (e.g., only manager or creator)
    # Since plans are tied to med_rep_id, maybe we check if current_user has access.
    
    return await crud_sales.update_plan(db, db_obj=plan, obj_in=plan_in)

@router.delete("/plans/{id}")
async def delete_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    plan = await crud_sales.get_plan(db, id=id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await crud_sales.delete_plan(db, id=id)
    return {"ok": True}


# Reservations (Bron)
@router.post("/reservations/", response_model=Reservation)
async def create_reservation(
    *,
    db: AsyncSession = Depends(deps.get_db),
    reservation_in: ReservationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.create_reservation(db, obj_in=reservation_in, user_id=current_user.id)

@router.get("/reservations/", response_model=List[Reservation])
async def read_reservations(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_reservations(db, skip=skip, limit=limit)

@router.patch("/reservations/{id}/status", response_model=Reservation)
async def update_reservation_status(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    status_update: ReservationUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    reservation = await crud_sales.get_reservation(db, id=id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    return await crud_sales.update_reservation_status(db, db_obj=reservation, status=status_update.status)

# Invoices (Factura)
@router.get("/invoices/", response_model=List[Invoice])
async def read_invoices(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_invoices(db, skip=skip, limit=limit)

# Payments
@router.post("/payments/", response_model=Payment)
async def create_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.create_payment(db, obj_in=payment_in, user_id=current_user.id)

# Facts & Doctor Assignments
@router.get("/facts/", response_model=List[SaleFact])
async def read_facts(
    db: AsyncSession = Depends(deps.get_db),
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_facts(db, med_rep_id=med_rep_id)

@router.get("/doctor-facts/", response_model=List[DoctorFactAssignment])
async def read_doctor_facts(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_doctor_fact_assignments(
        db, skip=skip, limit=limit, med_rep_id=med_rep_id
    )

@router.post("/doctor-facts/", response_model=DoctorFactAssignment)
async def create_doctor_fact(
    *,
    db: AsyncSession = Depends(deps.get_db),
    fact_in: DoctorFactAssignmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.create_doctor_fact_assignment(db, obj_in=fact_in)

# Bonus Payments
@router.get("/bonus-payments/", response_model=List[BonusPayment])
async def read_bonus_payments(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_bonus_payments(
        db, skip=skip, limit=limit, med_rep_id=med_rep_id
    )

@router.post("/bonus-payments/", response_model=BonusPayment)
async def create_bonus_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: BonusPaymentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    allowed_roles = {UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Only Deputy Director or higher can record bonus payments"
        )
    return await crud_sales.create_bonus_payment(db, obj_in=payment_in)

@router.patch("/bonus-payments/{payment_id}/", response_model=BonusPayment)
async def update_bonus_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_id: int,
    payment_in: BonusPaymentUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    allowed_roles = {UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await crud_sales.update_bonus_payment(db, payment_id=payment_id, obj_in=payment_in)
    if not result:
        raise HTTPException(status_code=404, detail="Bonus payment not found")
    return result
