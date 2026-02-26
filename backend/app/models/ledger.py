from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Date
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.base_class import Base

class LedgerType(str, enum.Enum):
    ADVANCE = "advance" # Predinvest
    PAYOUT = "payout"
    OFFSET = "offset" # Paid predinvest
    ACCRUAL = "accrual" # Earned bonus
    REVERSAL = "reversal" # Return

class BonusLedger(Base):
    """
    Unified ledger for Doctor and MedRep bonuses.
    Includes support for predinvest and offsets.
    """
    __tablename__ = "bonus_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True) # For MedRep
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=True) # For Doctor
    
    amount = Column(Float, nullable=False) # Positive is Credit (earned), Negative is Debit (paid out / advance)
    ledger_type = Column(String, nullable=False, default=LedgerType.ACCRUAL)
    
    # Context references
    invoice_item_id = Column(Integer, ForeignKey("reservationitem.id"), nullable=True)
    payment_id = Column(Integer, ForeignKey("payment.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(String, nullable=True)

    user = relationship("User")
    doctor = relationship("Doctor")
    invoice_item = relationship("ReservationItem")
    payment = relationship("Payment")

class DoctorMonthlyStat(Base):
    """
    Event-based counter table for Real-Time Dashboards.
    Prevents heavy JOIN aggregations.
    """
    __tablename__ = "doctor_monthly_stat"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    
    month = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    
    plan_quantity = Column(Integer, default=0)
    sold_quantity = Column(Integer, default=0) # Updated on reservation approval
    paid_quantity = Column(Integer, default=0) # Updated on payment
    
    paid_amount = Column(Float, default=0.0) # Updated on payment
    bonus_amount = Column(Float, default=0.0) # Accrued bonus from this product for the month
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    doctor = relationship("Doctor")
    product = relationship("Product")
