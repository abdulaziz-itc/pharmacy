from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class StockBase(BaseModel):
    product_id: int
    quantity: int

class Stock(StockBase):
    id: int
    warehouse_id: int
    class Config:
        orm_mode = True
        from_attributes = True

class WarehouseBase(BaseModel):
    name: str
    warehouse_type: str
    med_org_id: Optional[int] = None

class WarehouseCreate(WarehouseBase):
    pass

class Warehouse(WarehouseBase):
    id: int
    stocks: Optional[List[Stock]] = []
    is_wholesale: bool = False

    class Config:
        from_attributes = True

class StockFulfillment(BaseModel):
    product_id: int
    quantity: int
