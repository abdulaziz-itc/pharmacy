from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base
from app.models.crm import MedicalOrganization

class Visit(Base):
    id = Column(Integer, primary_key=True, index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=False)
    visit_date = Column(DateTime, default=datetime.utcnow)
    visit_type = Column(String, nullable=False)  # e.g., "Плановый", "Внеплановый"
    result = Column(String, nullable=True)  # e.g., "Успешно", "Отказ"
    notes = Column(Text, nullable=True)
    
    # Relationships
    med_rep = relationship("User", foreign_keys=[med_rep_id])
    doctor = relationship("Doctor", backref="visits")

class VisitPlan(Base):
    id = Column(Integer, primary_key=True, index=True)
    med_rep_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor.id"), nullable=True)
    med_org_id = Column(Integer, ForeignKey("medicalorganization.id"), nullable=True)
    planned_date = Column(DateTime, nullable=False)
    subject = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    visit_type = Column(String, nullable=True) # "Плановый", etc.
    status = Column(String, default="planned") # planned, completed, cancelled
    
    # Relationships
    med_rep = relationship("User", foreign_keys=[med_rep_id])
    doctor = relationship("Doctor", backref="visit_plans")
    med_org = relationship("MedicalOrganization", backref="visit_plans")
