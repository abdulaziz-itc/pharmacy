from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel
from app.models.sales import ReservationStatus, InvoiceStatus, PaymentType
from app.schemas.user import User
from app.schemas.product import Product
from app.schemas.crm import Doctor, MedicalOrganization

# Plan
class PlanBase(BaseModel):
    med_rep_id: int
    doctor_id: Optional[int] = None
    med_org_id: Optional[int] = None
    product_id: int
    month: int
    year: int
    target_amount: float
    target_quantity: int

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    target_amount: Optional[float] = None
    target_quantity: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None

class Plan(PlanBase):
    id: int
    med_org: Optional[MedicalOrganization] = None
    doctor: Optional[Doctor] = None
    product: Optional[Product] = None
    class Config:
        orm_mode = True
        from_attributes = True

# Reservation Item
class ReservationItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float
    discount_percent: float = 0.0

class ReservationItemCreate(ReservationItemBase):
    pass

class ReservationItem(ReservationItemBase):
    id: int
    total_price: float
    product: Optional[Product] = None
    class Config:
        orm_mode = True

# Reservation
class ReservationBase(BaseModel):
    customer_name: str
    med_org_id: Optional[int] = None
    description: Optional[str] = None
    validity_date: Optional[datetime] = None

class ReservationCreate(ReservationBase):
    warehouse_id: int
    items: List[ReservationItemCreate]

class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None

class Reservation(ReservationBase):
    id: int
    date: datetime
    status: ReservationStatus
    total_amount: float
    created_by_id: int
    created_by: Optional[User] = None
    # med_org: Optional[MedicalOrganization] = None
    items: List[ReservationItem] = []
    
    class Config:
        orm_mode = True

# Invoice
class InvoiceBase(BaseModel):
    reservation_id: int
    total_amount: float

class Invoice(InvoiceBase):
    id: int
    date: datetime
    paid_amount: float
    status: InvoiceStatus
    class Config:
        orm_mode = True

# Payment
class PaymentBase(BaseModel):
    invoice_id: int
    amount: float
    payment_type: PaymentType

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    date: datetime
    processed_by_id: int
    class Config:
        orm_mode = True

# Doctor Fact Assignment
class DoctorFactAssignmentBase(BaseModel):
    med_rep_id: int
    doctor_id: int
    product_id: int
    quantity: int
    month: int
    year: int

class DoctorFactAssignmentCreate(DoctorFactAssignmentBase):
    pass

class DoctorFactAssignment(DoctorFactAssignmentBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class SaleFact(BaseModel):
    id: int
    med_rep_id: int
    doctor_id: Optional[int] = None
    product_id: int
    date: str
    amount: float
    quantity: int

# Bonus Payment
class BonusPaymentBase(BaseModel):
    med_rep_id: int
    doctor_id: Optional[int] = None
    product_id: Optional[int] = None
    amount: float
    for_month: int
    for_year: int
    paid_date: date        # stored as Python date
    notes: Optional[str] = None

class BonusPaymentCreate(BonusPaymentBase):
    pass

class BonusPaymentUpdate(BaseModel):
    doctor_id: Optional[int] = None
    product_id: Optional[int] = None
    amount: Optional[float] = None
    for_month: Optional[int] = None
    for_year: Optional[int] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None

class ProductInBonus(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True
        from_attributes = True

class BonusPayment(BonusPaymentBase):
    id: int
    created_at: datetime
    product: Optional[ProductInBonus] = None
    class Config:
        orm_mode = True
        from_attributes = True
