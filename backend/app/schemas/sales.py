from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel
from app.models.sales import ReservationStatus, InvoiceStatus, PaymentType
from app.schemas.user import User
from app.schemas.product import Product
from app.schemas.crm import Doctor, MedicalOrganization
from app.schemas.warehouse import Warehouse

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
    returned_quantity: int = 0
    price: float
    discount_percent: float = 0.0

class ReservationReturnItem(BaseModel):
    product_id: int
    quantity: int

class ReservationReturnCreate(BaseModel):
    items: List[ReservationReturnItem]

class ReservationItemCreate(ReservationItemBase):
    pass

class ReservationItem(ReservationItemBase):
    id: int
    total_price: float
    product: Optional[Product] = None
    class Config:
        orm_mode = True
        from_attributes = True

# Reservation
class ReservationBase(BaseModel):
    customer_name: str
    med_org_id: Optional[int] = None
    description: Optional[str] = None
    validity_date: Optional[datetime] = None
    is_bonus_eligible: bool = True
    nds_percent: float = 12.0

class ReservationCreate(ReservationBase):
    warehouse_id: int
    items: List[ReservationItemCreate]

class ReservationUpdate(BaseModel):
    status: Optional[ReservationStatus] = None

class ReservationDataUpdate(BaseModel):
    factura_number: Optional[str] = None
    realization_date: Optional[datetime] = None
    discount_percent: Optional[float] = None

class Reservation(ReservationBase):
    id: int
    date: datetime
    status: ReservationStatus
    total_amount: float
    is_bonus_eligible: bool
    nds_percent: Optional[float] = 12.0
    created_by_id: int
    created_by: Optional[User] = None
    med_org: Optional[MedicalOrganization] = None
    warehouse: Optional[Warehouse] = None
    invoice: Optional["Invoice"] = None
    items: List[ReservationItem] = []
    
    class Config:
        orm_mode = True
        from_attributes = True

# Invoice
class InvoiceBase(BaseModel):
    reservation_id: int
    total_amount: float
    factura_number: Optional[str] = None
    realization_date: Optional[datetime] = None

class Invoice(InvoiceBase):
    id: int
    date: datetime
    paid_amount: float
    status: InvoiceStatus
    factura_number: Optional[str] = None
    realization_date: Optional[datetime] = None
    payments: List["Payment"] = []
    # reservation: Optional[Reservation] = None
    class Config:
        orm_mode = True
        from_attributes = True

# Payment
class PaymentBase(BaseModel):
    invoice_id: int
    amount: float
    payment_type: PaymentType
    comment: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    date: datetime
    processed_by_id: int
    processed_by: Optional[User] = None
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

# Unassigned Sale
class UnassignedSaleBase(BaseModel):
    invoice_id: int
    med_rep_id: int
    product_id: int
    total_quantity: int
    paid_quantity: int
    assigned_quantity: int

class UnassignedSale(UnassignedSaleBase):
    id: int
    product: Optional[Product] = None
    class Config:
        orm_mode = True
        from_attributes = True
