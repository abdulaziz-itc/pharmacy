from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.models.user import User, UserRole
from app.schemas.sales import Payment, PaymentCreate
from app.services.finance_service import FinancialService

router = APIRouter()

@router.post("/payments/", response_model=Payment)
async def process_payment_endpoint(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Processes a 'Postupleniya' Payment. Calculates bonuses, tracks partial invoices, and handles predinvest.
    """
    if current_user.role not in [UserRole.HEAD_OF_ORDERS, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR]:
        raise HTTPException(status_code=403, detail="Not enough permissions to process payments.")
        
    return await FinancialService.process_payment(
        db=db, 
        obj_in=payment_in, 
        processor_id=current_user.id
    )
