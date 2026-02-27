from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_crm
from app.models.user import User, UserRole
from app.schemas.crm import (
    Region, RegionCreate, 
    Doctor, DoctorCreate, DoctorUpdate,
    MedicalOrganization, MedicalOrganizationCreate, MedicalOrganizationUpdate,
    DoctorSpecialty, DoctorSpecialtyCreate,
    DoctorCategory, DoctorCategoryCreate
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.warehouse import Warehouse, Stock
from app.models.product import Product

router = APIRouter()

# Regions
@router.get("/regions/", response_model=List[Region])
async def read_regions(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_regions(db, skip=skip, limit=limit)

@router.post("/regions/", response_model=Region)
async def create_region(
    *,
    db: AsyncSession = Depends(deps.get_db),
    region_in: RegionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_crm.create_region(db, obj_in=region_in)

# Doctor Specialties
@router.get("/doctor-specialties/", response_model=List[DoctorSpecialty])
async def read_specialties(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_specialties(db, skip=skip, limit=limit)

@router.post("/doctor-specialties/", response_model=DoctorSpecialty)
async def create_specialty(
    *,
    db: AsyncSession = Depends(deps.get_db),
    specialty_in: DoctorSpecialtyCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_crm.create_specialty(db, obj_in=specialty_in)

# Doctor Categories
@router.get("/doctor-categories/", response_model=List[DoctorCategory])
async def read_doctor_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_doctor_categories(db, skip=skip, limit=limit)

@router.post("/doctor-categories/", response_model=DoctorCategory)
async def create_doctor_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: DoctorCategoryCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_crm.create_doctor_category(db, obj_in=category_in)

# Medical Organizations
@router.get("/med-orgs/", response_model=List[MedicalOrganization])
async def read_med_orgs(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        return await crud_crm.get_med_orgs(
            db, 
            skip=skip, 
            limit=limit, 
            name=name, 
            region_id=region_id, 
            rep_id=rep_id
        )
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=str(error_msg))

@router.post("/med-orgs/", response_model=MedicalOrganization)
async def create_med_org(
    *,
    db: AsyncSession = Depends(deps.get_db),
    med_org_in: MedicalOrganizationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_crm.create_med_org(db, obj_in=med_org_in)

@router.put("/med-orgs/{id}", response_model=MedicalOrganization)
async def update_med_org(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    med_org_in: MedicalOrganizationUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    med_org = await crud_crm.get_med_org(db, id=id)
    if not med_org:
        raise HTTPException(status_code=404, detail="Medical Organization not found")
        
    return await crud_crm.update_med_org(db, db_obj=med_org, obj_in=med_org_in)

@router.get("/med-orgs/{id}/stock")
async def get_med_org_stock(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get warehouse stock for a specific medical organization (e.g. Pharmacy)
    """
    # Find the warehouse assigned to this med org
    warehouse_result = await db.execute(select(Warehouse).where(Warehouse.med_org_id == id))
    warehouse = warehouse_result.scalars().first()
    
    if not warehouse:
        # If no warehouse is assigned, they have no stock
        return []
        
    # Get stock with product names
    stock_query = select(Stock).options(selectinload(Stock.product)).where(Stock.warehouse_id == warehouse.id)
    stock_result = await db.execute(stock_query)
    stocks = stock_result.scalars().all()
    
    result = []
    for s in stocks:
        result.append({
            "product_id": s.product_id,
            "product_name": s.product.name if s.product else "Unknown",
            "quantity": s.quantity
        })
        
    return result

# Doctors
@router.get("/doctors/", response_model=List[Doctor])
async def read_doctors(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    specialty_id: Optional[int] = None,
    med_org_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_doctors(
        db, 
        skip=skip, 
        limit=limit, 
        name=name, 
        region_id=region_id, 
        specialty_id=specialty_id, 
        med_org_id=med_org_id,
        rep_id=rep_id
    )

@router.post("/doctors/", response_model=Doctor)
async def create_doctor(
    *,
    db: AsyncSession = Depends(deps.get_db),
    doctor_in: DoctorCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_crm.create_doctor(db, obj_in=doctor_in)

@router.put("/doctors/{id}", response_model=Doctor)
async def update_doctor(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    doctor_in: DoctorUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    doctor = await crud_crm.get_doctor(db, id=id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return await crud_crm.update_doctor(db, db_obj=doctor, obj_in=doctor_in)
