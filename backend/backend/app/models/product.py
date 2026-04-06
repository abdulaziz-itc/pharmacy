from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Table, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

# Association table for Many-to-Many relationship between Product and Manufacturer
product_manufacturer = Table(
    'product_manufacturer',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('product.id', ondelete='CASCADE'), primary_key=True),
    Column('manufacturer_id', Integer, ForeignKey('manufacturer.id', ondelete='CASCADE'), primary_key=True)
)

class Manufacturer(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    products = relationship("Product", secondary=product_manufacturer, back_populates="manufacturers")

class Category(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    products = relationship("Product", back_populates="category")

class Product(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False) # Sale price
    production_price = Column(Float, nullable=False) # Cost price
    
    category_id = Column(Integer, ForeignKey("category.id"))
    category = relationship("Category", back_populates="products")
    
    manufacturers = relationship("Manufacturer", secondary=product_manufacturer, back_populates="products")
    
    is_active = Column(Boolean, default=True)
    
    marketing_expense = Column(Float, default=0.0)
    salary_expense = Column(Float, default=0.0)
    other_expenses = Column(Float, default=0.0)  # Прочие расходы
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
