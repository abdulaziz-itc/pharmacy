from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.crm import MedicalOrganization, MedicalOrganizationStock, Region
from app.models.user import User
from app.models.product import Product

router = APIRouter()

@router.get("/")
async def get_pharmacy_stocks(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get balances for all pharmacy organizations.
    Returns aggregated total quantity and per-product breakdown.
    """
    # 1. Fetch all medical organizations that are PHARMACIES
    # For simplicity, we can just fetch all med orgs that have stocks records
    # or filter by org_type if needed.
    
    query = select(MedicalOrganization).options(
        selectinload(MedicalOrganization.region),
        selectinload(MedicalOrganization.assigned_reps),
        selectinload(MedicalOrganization.stocks).selectinload(MedicalOrganizationStock.product)
    ).join(MedicalOrganizationStock, MedicalOrganization.id == MedicalOrganizationStock.med_org_id).distinct()
    
    result = await db.execute(query)
    orgs = result.scalars().all()
    
    response = []
    for org in orgs:
        total_qty = sum(s.quantity for s in org.stocks)
        
        items = []
        for s in org.stocks:
            items.append({
                "product_id": s.product_id,
                "product_name": s.product.name if s.product else "Noma'lum",
                "quantity": s.quantity
            })
            
        response.append({
            "id": org.id,
            "name": org.name,
            "region": org.region.name if org.region else "Noma'lum",
            "med_rep": org.assigned_reps[0].full_name if org.assigned_reps else "Tayinlanmagan",
            "total_quantity": total_qty,
            "items": items
        })
        
    return response
