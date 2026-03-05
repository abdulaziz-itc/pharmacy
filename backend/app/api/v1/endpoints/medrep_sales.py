from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.models.sales import UnassignedSale
from app.schemas.sales import UnassignedSale as UnassignedSaleSchema, DoctorFactAssignment
from app.services.finance_service import FinancialService

router = APIRouter()

@router.get("/unassigned-sales/", response_model=List[UnassignedSaleSchema])
async def list_unassigned_sales(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all paid but unassigned product quantities for the current MedRep."""
    query = select(UnassignedSale).options(selectinload(UnassignedSale.product)).where(
        UnassignedSale.med_rep_id == current_user.id
    )
    # We only show those that have something to assign
    # UnassignedSale.paid_quantity > UnassignedSale.assigned_quantity
    query = query.where(UnassignedSale.paid_quantity > UnassignedSale.assigned_quantity)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/unassigned-sales/{id}/assign", response_model=DoctorFactAssignment)
async def assign_sale_to_doctor(
    id: int,
    doctor_id: int,
    quantity: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Assign unassigned quantity to a doctor to trigger bonus and facts."""
    return await FinancialService.assign_unassigned_sale(
        db, current_user.id, id, doctor_id, quantity
    )
