from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Enum, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.base_class import Base

class ReservationStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    CANCELLED = "cancelled"

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    RETURNED = "returned"
    CANCELLED = "cancelled"

class PaymentType(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    OTHER = "other"

class Plan(Base):
    id = Column(Integer, primary_key=True, index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"))
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=True)
    med_org_id = Column(Integer, ForeignKey("medicalorganization.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    target_amount = Column(Float, default=0.0)
    target_quantity = Column(Integer, default=0)
    deadline = Column(DateTime, nullable=True) 

    med_rep = relationship("User", backref="plans")
    doctor = relationship("Doctor", backref="plans")
    med_org = relationship("MedicalOrganization", backref="plans")
    product = relationship("Product", backref="plans")

class Invoice(Base): 
    """
    Represents an Invoice (Factura).
    This is the official record of sale and realization.
    Tracks total amount, paid amount, and payment status.
    Linked 1-to-1 with a Reservation.
    """
    __tablename__ = "invoice"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    status = Column(String, default=InvoiceStatus.DRAFT, index=True)
    currency = Column(String, default="UZS")
    reservation_id = Column(Integer, ForeignKey("reservation.id"), unique=True)
    factura_number = Column(String, nullable=True)
    realization_date = Column(DateTime, nullable=True)
    promo_balance = Column(Float, default=0.0) # Marketing balance available for tovar_skidka
    
    # Deletion Approval Flow
    is_deletion_pending = Column(Boolean, default=False)
    deletion_requested_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    reservation = relationship("Reservation", back_populates="invoice", foreign_keys=[reservation_id])
    payments = relationship("Payment", back_populates="invoice")

class Reservation(Base): # Bron
    __tablename__ = "reservation"
    id = Column(Integer, primary_key=True, index=True)
    created_by_id = Column(Integer, ForeignKey("user.id")) 
    customer_name = Column(String, nullable=False) 
    med_org_id = Column(Integer, ForeignKey("medicalorganization.id"), nullable=True) 
    warehouse_id = Column(Integer, ForeignKey("warehouse.id"), nullable=True) 
    date = Column(DateTime, default=datetime.utcnow)
    validity_date = Column(DateTime, nullable=True)
    
    status = Column(String, default=ReservationStatus.PENDING, index=True)
    total_amount = Column(Float, default=0.0)
    nds_percent = Column(Float, default=12.0)
    description = Column(String, nullable=True)
    is_bonus_eligible = Column(Boolean, default=True)
    is_salary_enabled = Column(Boolean, default=True)
    is_tovar_skidka = Column(Boolean, default=False)
    source_invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=True)
    
    # Deletion Approval Flow
    is_deletion_pending = Column(Boolean, default=False)
    deletion_requested_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    # Return Approval Flow
    is_return_pending = Column(Boolean, default=False)
    
    created_by = relationship("User", backref="reservations_created", foreign_keys=[created_by_id])
    med_org = relationship("MedicalOrganization", backref="reservations")
    warehouse = relationship("Warehouse", backref="reservations")
    items = relationship("ReservationItem", back_populates="reservation", cascade="all, delete-orphan")
    invoice = relationship("Invoice", uselist=False, back_populates="reservation", foreign_keys="Invoice.reservation_id")
    source_invoice = relationship("Invoice", foreign_keys=[source_invoice_id])

class ReservationItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(Integer, ForeignKey("reservation.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("product.id"))
    manufacturer_id = Column(Integer, ForeignKey("manufacturer.id"), nullable=True) 
    quantity = Column(Integer, nullable=False)
    returned_quantity = Column(Integer, default=0, nullable=False)
    return_requested_quantity = Column(Integer, default=0, server_default="0", nullable=False)
    price = Column(Float, nullable=False) 
    discount_percent = Column(Float, default=0.0)
    marketing_amount = Column(Float, default=0.0) # Snapshotted marketing sum per unit
    salary_amount = Column(Float, default=0.0) # Snapshotted salary sum per unit
    production_price = Column(Float, default=0.0) # Snapshotted cost price per unit
    other_expenses = Column(Float, default=0.0) # Snapshotted other expenses per unit
    total_price = Column(Float, default=0.0) 

    @property
    def default_marketing_amount(self) -> float:
        return self.product.marketing_expense if self.product else 0.0

    reservation = relationship("Reservation", back_populates="items")
    product = relationship("Product")
    manufacturer = relationship("Manufacturer")

class Payment(Base): # Postupleniya
    __tablename__ = "payment"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), index=True)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    payment_type = Column(String, default=PaymentType.BANK)
    comment = Column(Text, nullable=True)
    processed_by_id = Column(Integer, ForeignKey("user.id")) 
    allocated_doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=True) 
    
    invoice = relationship("Invoice", back_populates="payments")
    processed_by = relationship("User")
    allocated_doctor = relationship("Doctor")

class DoctorFactAssignment(Base):
    """
    Records facts (bonus quantities) that a MedRep has manually assigned to a Doctor.
    """
    __tablename__ = "doctor_fact_assignment"
    id = Column(Integer, primary_key=True, index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    amount = Column(Float, nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    med_rep = relationship("User", foreign_keys=[med_rep_id])
    doctor = relationship("Doctor", foreign_keys=[doctor_id])
    product = relationship("Product", foreign_keys=[product_id])

class BonusPayment(Base):
    """
    Records a bonus payment made by the company to a MedRep.
    Tracks: which doctor and product the bonus is for, which month, payment date, amount.
    """
    __tablename__ = "bonus_payment"
    id = Column(Integer, primary_key=True, index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=True)
    amount = Column(Float, nullable=False)
    for_month = Column(Integer, nullable=False)   # Month of facts this bonus covers
    for_year = Column(Integer, nullable=False)    # Year of facts this bonus covers
    paid_date = Column(Date, nullable=False)      # Date the bonus was actually paid
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    med_rep = relationship("User", foreign_keys=[med_rep_id])
    doctor = relationship("Doctor", foreign_keys=[doctor_id])
    product = relationship("Product", foreign_keys=[product_id])

class UnassignedSale(Base):
    """
    Tracks paid product quantities from facturas that haven't been assigned to a doctor (bonus) yet.
    """
    __tablename__ = "unassigned_sale"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"), index=True)
    product_id = Column(Integer, ForeignKey("product.id"), index=True)
    
    total_quantity = Column(Integer, nullable=False)
    paid_quantity = Column(Integer, default=0) # updated based on factura payment %
    assigned_quantity = Column(Integer, default=0) # quantity assigned to doctors
    
    invoice = relationship("Invoice")
    med_rep = relationship("User")
    product = relationship("Product")
