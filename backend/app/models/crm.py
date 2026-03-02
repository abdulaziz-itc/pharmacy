from sqlalchemy import Column, Integer, String, ForeignKey, Date, Float, DateTime, Table, Boolean
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.base_class import Base

class MedicalOrganizationType(str, enum.Enum):
    CLINIC = "clinic"
    PHARMACY = "pharmacy"
    LECHEBNIY = "lechebniy"
    HOSPITAL = "hospital"

# Association table for MedRep to Organization (Many-to-Many)
medrep_organization = Table(
    'medrep_organization',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('user.id', ondelete="CASCADE"), primary_key=True),
    Column('organization_id', Integer, ForeignKey('medicalorganization.id', ondelete="CASCADE"), primary_key=True)
)

class Region(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    med_orgs = relationship("MedicalOrganization", back_populates="region")
    doctors = relationship("Doctor", back_populates="region")

class DoctorSpecialty(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    doctors = relationship("Doctor", back_populates="specialty")

class DoctorCategory(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    doctors = relationship("Doctor", back_populates="category")

class MedicalOrganization(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    region_id = Column(Integer, ForeignKey("region.id"))
    org_type = Column(String, default=MedicalOrganizationType.CLINIC)
    brand = Column(String, nullable=True)
    director_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Replaced assigned_rep_id with many-to-many relationship
    assigned_reps = relationship("User", secondary=medrep_organization, backref="assigned_organizations")
    
    region = relationship("Region", back_populates="med_orgs")
    doctors = relationship("Doctor", back_populates="med_org")

class Doctor(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    contact1 = Column(String, nullable=True)
    contact2 = Column(String, nullable=True)
    email = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)

    region_id = Column(Integer, ForeignKey("region.id"))
    specialty_id = Column(Integer, ForeignKey("doctorspecialty.id"))
    category_id = Column(Integer, ForeignKey("doctorcategory.id"))
    med_org_id = Column(Integer, ForeignKey("medicalorganization.id"))
    assigned_rep_id = Column(Integer, ForeignKey("user.id")) # Med Rep (one doctor is typically managed by one medrep, but can be shifted transactionally)
    
    region = relationship("Region", back_populates="doctors")
    specialty = relationship("DoctorSpecialty", back_populates="doctors")
    category = relationship("DoctorCategory", back_populates="doctors")
    med_org = relationship("MedicalOrganization", back_populates="doctors")
    assigned_rep = relationship("User", backref="assigned_doctors")

class Notification(Base):
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    message = Column(String, nullable=False)
    recipient_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="unread") # read, unread
    
    related_entity_type = Column(String, nullable=True)
    related_entity_name = Column(String, nullable=True)
    
    recipient = relationship("User", backref="notifications")
