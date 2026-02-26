from typing import Optional, List
from pydantic import BaseModel
# Manufacturer
class ManufacturerBase(BaseModel):
    name: str

class ManufacturerCreate(ManufacturerBase):
    pass

class ManufacturerUpdate(BaseModel):
    name: str


class Manufacturer(ManufacturerBase):
    id: int
    class Config:
        orm_mode = True
        from_attributes = True

# Category
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class Category(CategoryBase):
    id: int
    class Config:
        orm_mode = True
        from_attributes = True

# Product
class ProductBase(BaseModel):
    name: str
    price: float
    production_price: float
    is_active: Optional[bool] = True
    marketing_expense: Optional[float] = 0.0
    salary_expense: Optional[float] = 0.0
    other_expenses: Optional[float] = 0.0  # Прочие расходы
    category_id: int

class ProductCreate(ProductBase):
    manufacturer_ids: List[int]

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    production_price: Optional[float] = None
    is_active: Optional[bool] = None
    marketing_expense: Optional[float] = None
    salary_expense: Optional[float] = None
    other_expenses: Optional[float] = None  # Прочие расходы
    manufacturer_ids: Optional[List[int]] = None
    category_id: Optional[int] = None

class Product(ProductBase):
    id: int
    manufacturers: Optional[List[Manufacturer]] = []
    category: Optional[Category] = None
    
    class Config:
        orm_mode = True
        from_attributes = True
