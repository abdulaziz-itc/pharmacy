from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from sqlalchemy import select
from app.api import deps
from app.crud import crud_product
from app.models.user import User, UserRole
from app.schemas.product import Category, CategoryCreate, CategoryUpdate, Manufacturer, ManufacturerCreate, ManufacturerUpdate
from app.schemas.warehouse import Warehouse
from app.models.warehouse import Warehouse as WarehouseModel

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
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    category = await crud_product.create_category(db, obj_in=category_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Category", category.id,
        f"Создана категория продукта: {category.name}",
        request
    )
    return category

@router.put("/categories/{id}", response_model=Category)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    category = await crud_product.get_category(db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    updated_category = await crud_product.update_category(db, db_obj=category, obj_in=category_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "UPDATE", "Category", updated_category.id,
        f"Категория продукта изменена: {updated_category.name}",
        request
    )
    return updated_category

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
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    manufacturer = await crud_product.create_manufacturer(db, obj_in=manufacturer_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Manufacturer", manufacturer.id,
        f"Создан производитель: {manufacturer.name}",
        request
    )
    return manufacturer

@router.put("/manufacturers/{id}", response_model=Manufacturer)
async def update_manufacturer(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    manufacturer_in: ManufacturerUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    manufacturer = await crud_product.get_manufacturer(db, id=id)
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    updated_manufacturer = await crud_product.update_manufacturer(db, db_obj=manufacturer, obj_in=manufacturer_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "UPDATE", "Manufacturer", updated_manufacturer.id,
        f"Производитель изменен: {updated_manufacturer.name}",
        request
    )
    return updated_manufacturer

# Warehouses
@router.get("/warehouses/", response_model=List[Warehouse])
async def read_warehouses(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    result = await db.execute(
        select(WarehouseModel)
        .options(selectinload(WarehouseModel.stocks))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
