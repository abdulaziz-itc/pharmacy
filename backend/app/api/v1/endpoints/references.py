from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_product
from app.models.user import User, UserRole
from app.schemas.product import Category, CategoryCreate, CategoryUpdate, Manufacturer, ManufacturerCreate, ManufacturerUpdate

router = APIRouter()

# Categories
@router.get("/categories/", response_model=List[Category])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_product.get_categories(db, skip=skip, limit=limit)

@router.post("/categories/", response_model=Category)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_product.create_category(db, obj_in=category_in)

@router.put("/categories/{id}", response_model=Category)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    category = await crud_product.get_category(db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    return await crud_product.update_category(db, db_obj=category, obj_in=category_in)

# Manufacturers
@router.get("/manufacturers/", response_model=List[Manufacturer])
async def read_manufacturers(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_product.get_manufacturers(db, skip=skip, limit=limit)

@router.post("/manufacturers/", response_model=Manufacturer)
async def create_manufacturer(
    *,
    db: AsyncSession = Depends(deps.get_db),
    manufacturer_in: ManufacturerCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return await crud_product.create_manufacturer(db, obj_in=manufacturer_in)

@router.put("/manufacturers/{id}", response_model=Manufacturer)
async def update_manufacturer(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    manufacturer_in: ManufacturerUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    manufacturer = await crud_product.get_manufacturer(db, id=id)
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return await crud_product.update_manufacturer(db, db_obj=manufacturer, obj_in=manufacturer_in)
