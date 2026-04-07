from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import User

class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategory(ExpenseCategoryBase):
    id: int
    class Config:
        from_attributes = True

class OtherExpenseBase(BaseModel):
    category_id: int
    amount: float
    comment: Optional[str] = None
    date: Optional[datetime] = None

class OtherExpenseCreate(OtherExpenseBase):
    pass

class OtherExpense(OtherExpenseBase):
    id: int
    created_by_id: int
    created_by: Optional[User] = None
    category: Optional[ExpenseCategory] = None
    
    class Config:
        from_attributes = True

class FinanceStats(BaseModel):
    total_gross_profit: float
    total_expenses: float
    net_profit: float
    inflow: float
    outflow: float

class SalaryPaymentCreate(BaseModel):
    user_id: int
    amount: float
    notes: Optional[str] = None
    target_month: Optional[int] = None
    target_year: Optional[int] = None
    category: Optional[str] = "salary"  # 'salary' or 'bonus'
