from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.product import Product, Category, Manufacturer
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate, ManufacturerCreate, ManufacturerUpdate

# Product
async def get_product(db: AsyncSession, id: int) -> Optional[Product]:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.manufacturers), selectinload(Product.category))
        .where(Product.id == id)
    )
    return result.scalars().first()

async def get_products(
    db: AsyncSession, 
    *,
    skip: int = 0, 
    limit: int = 100,
    name: Optional[str] = None,
    manufacturer_id: Optional[int] = None,
    category_id: Optional[int] = None,
) -> List[Product]:
    query = select(Product).options(
        selectinload(Product.manufacturers), 
        selectinload(Product.category)
    )
    
    if name:
        query = query.where(Product.name.ilike(f"%{name}%"))
    if manufacturer_id:
        query = query.where(Product.manufacturers.any(Manufacturer.id == manufacturer_id))
    if category_id:
        query = query.where(Product.category_id == category_id)
        
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_product(db: AsyncSession, obj_in: ProductCreate) -> Product:
    obj_data = obj_in.dict()
    manufacturer_ids = obj_data.pop("manufacturer_ids", [])
    
    db_obj = Product(**obj_data)
    
    if manufacturer_ids:
        manufacturers = await db.execute(select(Manufacturer).where(Manufacturer.id.in_(manufacturer_ids)))
        db_obj.manufacturers = manufacturers.scalars().all()
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    # Reload with relationships
    return await get_product(db, db_obj.id)

async def update_product(db: AsyncSession, db_obj: Product, obj_in: ProductUpdate) -> Product:
    update_data = obj_in.dict(exclude_unset=True)
    manufacturer_ids = update_data.pop("manufacturer_ids", None)
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    if manufacturer_ids is not None:
        manufacturers = await db.execute(select(Manufacturer).where(Manufacturer.id.in_(manufacturer_ids)))
        db_obj.manufacturers = manufacturers.scalars().all()
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_product(db, db_obj.id)

# Category
async def get_category(db: AsyncSession, id: int) -> Optional[Category]:
    result = await db.execute(select(Category).where(Category.id == id))
    return result.scalars().first()

async def get_categories(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Category]:
    result = await db.execute(select(Category).offset(skip).limit(limit))
    return result.scalars().all()

async def create_category(db: AsyncSession, obj_in: CategoryCreate) -> Category:
    db_obj = Category(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_category(db: AsyncSession, db_obj: Category, obj_in: CategoryUpdate) -> Category:
    update_data = obj_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Manufacturer
async def get_manufacturers(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Manufacturer]:
    result = await db.execute(select(Manufacturer).offset(skip).limit(limit))
    return result.scalars().all()

async def create_manufacturer(db: AsyncSession, obj_in: ManufacturerCreate) -> Manufacturer:
    db_obj = Manufacturer(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_manufacturer(db: AsyncSession, id: int) -> Optional[Manufacturer]:
    result = await db.execute(select(Manufacturer).where(Manufacturer.id == id))
    return result.scalars().first()

async def update_manufacturer(db: AsyncSession, db_obj: Manufacturer, obj_in: ManufacturerUpdate) -> Manufacturer:
    db_obj.name = obj_in.name
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
