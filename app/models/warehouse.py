from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.base_class import Base

class WarehouseType(str, enum.Enum):
    CENTRAL = "central"
    PHARMACY = "pharmacy"

class StockMovementType(str, enum.Enum):
    RESERVATION = "reservation"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
    PURCHASE = "purchase"

class Warehouse(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    warehouse_type = Column(String, default=WarehouseType.CENTRAL)
    # If the warehouse belongs to a specific pharmacy organization:
    med_org_id = Column(Integer, ForeignKey("medicalorganization.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    med_org = relationship("MedicalOrganization", backref="warehouses")
    stocks = relationship("Stock", back_populates="warehouse", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "warehouse_stock"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouse.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, default=0, nullable=False)
    
    warehouse = relationship("Warehouse", back_populates="stocks")
    product = relationship("Product")
    
class StockMovement(Base):
    __tablename__ = "warehouse_stock_movement"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("warehouse_stock.id"), nullable=False)
    movement_type = Column(String, nullable=False) # reservation, return, adjustment
    quantity_change = Column(Integer, nullable=False) # Positive for incoming, negative for outgoing
    reference_id = Column(Integer, nullable=True) # e.g., Reservation ID or Invoice ID
    created_at = Column(DateTime, default=datetime.utcnow)
    
    stock = relationship("Stock", backref="movements")
