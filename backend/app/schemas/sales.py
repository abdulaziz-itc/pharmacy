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
    fact_quantity: Optional[int] = 0
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
    marketing_amount: Optional[float] = 0.0
    salary_amount: Optional[float] = 0.0
    return_requested_quantity: int = 0

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
    default_marketing_amount: Optional[float] = 0.0
    
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
    is_salary_enabled: bool = True
    nds_percent: float = 12.0
    is_tovar_skidka: bool = False
    source_invoice_id: Optional[int] = None
    is_deletion_pending: bool = False
    deletion_requested_by_id: Optional[int] = None
    is_return_pending: bool = False

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
    is_salary_enabled: bool
    nds_percent: Optional[float] = 12.0
    is_tovar_skidka: bool = False
    source_invoice_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    created_by_id: int
    created_by: Optional[User] = None
    med_org: Optional[MedicalOrganization] = None
    warehouse: Optional[Warehouse] = None
    invoice: Optional["Invoice"] = None
    items: List[ReservationItem] = []
    
    class Config:
        orm_mode = True
        from_attributes = True

# Reservation schema used inside Invoice to break circular reference
class ReservationInInvoice(ReservationBase):
    id: int
    date: datetime
    status: ReservationStatus
    total_amount: float
    is_bonus_eligible: bool
    is_salary_enabled: bool
    nds_percent: Optional[float] = 12.0
    is_tovar_skidka: bool = False
    source_invoice_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    created_by_id: int
    created_by: Optional[User] = None
    med_org: Optional[MedicalOrganization] = None
    warehouse: Optional[Warehouse] = None
    items: List[ReservationItem] = []
    # Note: no 'invoice' field here - avoids circular reference
    
    class Config:
        orm_mode = True
        from_attributes = True

# Invoice
class InvoiceBase(BaseModel):
    reservation_id: int
    total_amount: float
    factura_number: Optional[str] = None
    realization_date: Optional[datetime] = None
    promo_balance: float = 0.0
    is_deletion_pending: bool = False
    deletion_requested_by_id: Optional[int] = None

class Invoice(InvoiceBase):
    id: int
    date: datetime
    paid_amount: float
    status: InvoiceStatus
    factura_number: Optional[str] = None
    realization_date: Optional[datetime] = None
    promo_balance: float = 0.0
    payments: List["Payment"] = []
    reservation: Optional[ReservationInInvoice] = None
    class Config:
        orm_mode = True
        from_attributes = True


class MedicalOrganizationLite(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    org_type: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReservationLite(ReservationBase):
    id: int
    date: datetime
    status: ReservationStatus
    total_amount: float
    is_bonus_eligible: bool
    is_salary_enabled: bool
    nds_percent: Optional[float] = 12.0
    med_org: Optional[MedicalOrganizationLite] = None
    warehouse_id: int
    created_by_id: int
    items: List[ReservationItem] = []
    
    class Config:
        from_attributes = True

class InvoiceLite(InvoiceBase):
    id: int
    date: datetime
    paid_amount: float
    status: InvoiceStatus
    reservation: Optional[ReservationLite] = None

    class Config:
        from_attributes = True

# Optimized schemas for approval requests
class ApprovalItemSchema(BaseModel):
    product_name: str
    quantity: int
    price: float
    total_price: float
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            product_name=obj.product.name if obj.product else "N/A",
            quantity=obj.quantity,
            price=obj.price,
            total_price=obj.total_price
        )

    class Config:
        from_attributes = True

class ApprovalReservationSchema(BaseModel):
    id: int
    customer_name: str
    med_org_name: Optional[str] = None
    date: datetime
    total_amount: float
    items: List[ApprovalItemSchema] = []
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            customer_name=obj.customer_name,
            med_org_name=obj.med_org.name if obj.med_org else None,
            date=obj.date,
            total_amount=obj.total_amount,
            items=[ApprovalItemSchema.from_orm(item) for item in obj.items]
        )

    class Config:
        from_attributes = True

class ApprovalInvoiceSchema(BaseModel):
    id: int
    factura_number: Optional[str] = None
    date: datetime
    total_amount: float
    reservation: Optional[ApprovalReservationSchema] = None
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            factura_number=obj.factura_number,
            date=obj.date,
            total_amount=obj.total_amount,
            reservation=ApprovalReservationSchema.from_orm(obj.reservation) if obj.reservation else None
        )

    class Config:
        from_attributes = True

class DeletionRequests(BaseModel):
    reservations: List[ApprovalReservationSchema]
    invoices: List[ApprovalInvoiceSchema]
    return_requests: List[ApprovalReservationSchema] = []
    debug_timestamp: Optional[float] = None

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

Reservation.model_rebuild()
Invoice.model_rebuild()

# Doctor Fact Assignment
class DoctorFactAssignmentBase(BaseModel):
    med_rep_id: int
    doctor_id: int
    product_id: int
    quantity: int
    amount: Optional[float] = None
    month: int
    year: int

class DoctorFactAssignmentCreate(DoctorFactAssignmentBase):
    pass

class DoctorFactAssignment(DoctorFactAssignmentBase):
    id: int
    created_at: datetime
    product: Optional[Product] = None
    class Config:
        orm_mode = True
        from_attributes = True

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

# Bonus Allocation
class BonusAllocationCreate(BaseModel):
    med_rep_id: Optional[int] = None  # If provided, allocate from this MedRep's balance (for admins/directors)
    doctor_id: int
    product_id: int  # Required - bonus tied to specific product
    quantity: int    # Number of units doctor is being paid bonus for
    amount_per_unit: Optional[float] = None # MedRep can override how much per unit
    target_month: int
    target_year: int
    notes: Optional[str] = None

# Unassigned Sale Sub-schemas
class MedOrgInUnassigned(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class ReservationInUnassigned(BaseModel):
    id: int
    med_org: Optional[MedOrgInUnassigned] = None
    class Config:
        from_attributes = True

class InvoiceInUnassigned(BaseModel):
    id: int
    reservation: Optional[ReservationInUnassigned] = None
    total_amount: float
    paid_amount: float
    class Config:
        from_attributes = True

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
    invoice: Optional[InvoiceInUnassigned] = None
    class Config:
        orm_mode = True
        from_attributes = True
