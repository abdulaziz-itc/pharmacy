from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_product
from app.models.user import User, UserRole
from app.schemas.product import Product, ProductCreate, ProductUpdate

router = APIRouter()

@router.get("/", response_model=List[Product])
async def read_products(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    manufacturer_id: Optional[int] = None,
    category_id: Optional[int] = None,
    warehouse_id: Optional[int] = 1,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve products.
    """
    return await crud_product.get_products(
        db, 
        skip=skip, 
        limit=limit, 
        name=name, 
        manufacturer_id=manufacturer_id, 
        category_id=category_id,
        warehouse_id=warehouse_id
    )

@router.post("/", response_model=Product)
async def create_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    product_in: ProductCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    """
    Create new product.
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    product = await crud_product.create_product(db, obj_in=product_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Product", product.id,
        f"Создан новый продукт: {product.name}",
        request
    )
    return product

@router.get("/{id}", response_model=Product)
async def read_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get product by ID.
    """
    product = await crud_product.get_product(db, id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{id}", response_model=Product)
async def update_product(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    """
    Update a product.
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    product = await crud_product.get_product(db, id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    updated_product = await crud_product.update_product(db, db_obj=product, obj_in=product_in)
    from app.services.audit_service import log_action
    
    status_msg = ""
    if product_in.is_active is not None and product.is_active != product_in.is_active:
        status_msg = f" (Статус: {'Активен' if product_in.is_active else 'Неактивен'})"
        
    await log_action(
        db, current_user, "UPDATE", "Product", updated_product.id,
        f"Продукт изменен: {updated_product.name}{status_msg}",
        request
    )
    return updated_product


