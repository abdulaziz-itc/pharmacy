from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

class ExpenseCategory(Base):
    """
    Categories for organization expenses (Rent, Taxes, Utilities, Staff Salaries etc.)
    """
    __tablename__ = "expense_category"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    
    expenses = relationship("OtherExpense", back_populates="category")

class OtherExpense(Base):
    """
    Records of organization-wide expenses that reduce net profit.
    """
    __tablename__ = "other_expense"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_category.id"), nullable=False)
    amount = Column(Float, nullable=False)
    comment = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    
    category = relationship("ExpenseCategory", back_populates="expenses")
    created_by = relationship("User")
