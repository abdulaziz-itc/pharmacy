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
        orm_mode = True
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        instance = super().from_orm(obj)
        instance.is_wholesale = obj.med_org_id is not None
        return instance

class StockFulfillment(BaseModel):
    product_id: int
    quantity: int
