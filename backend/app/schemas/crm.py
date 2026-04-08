from typing import Optional, List
from datetime import date
from pydantic import BaseModel
from app.schemas.user import User
from app.models.crm import MedicalOrganizationType

# Region
class RegionBase(BaseModel):
    name: str

class RegionCreate(RegionBase):
    pass

class RegionUpdate(BaseModel):
    name: Optional[str] = None

class Region(RegionBase):
    id: int
    class Config:
        orm_mode = True
        from_attributes = True

# DoctorSpecialty
class DoctorSpecialtyBase(BaseModel):
    name: str

class DoctorSpecialtyCreate(DoctorSpecialtyBase):
    pass

class DoctorSpecialty(DoctorSpecialtyBase):
    id: int
    class Config:
        orm_mode = True
        from_attributes = True

# DoctorCategory
class DoctorCategoryBase(BaseModel):
    name: str

class DoctorCategoryCreate(DoctorCategoryBase):
    pass

class DoctorCategory(DoctorCategoryBase):
    id: int
    class Config:
        orm_mode = True
        from_attributes = True

# MedicalOrganization
class MedicalOrganizationBase(BaseModel):
    name: str
    address: Optional[str] = None
    region_id: int
    org_type: Optional[MedicalOrganizationType] = MedicalOrganizationType.CLINIC
    brand: Optional[str] = None
    inn: Optional[str] = None
    director_name: Optional[str] = None
    contact_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    credit_balance: Optional[float] = 0.0

class MedicalOrganizationCreate(MedicalOrganizationBase):
    inn: str
    assigned_rep_ids: Optional[List[int]] = []

class MedicalOrganizationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    region_id: Optional[int] = None
    org_type: Optional[MedicalOrganizationType] = None
    brand: Optional[str] = None
    inn: Optional[str] = None
    director_name: Optional[str] = None
    contact_phone: Optional[str] = None
    assigned_rep_ids: Optional[List[int]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MedicalOrganization(MedicalOrganizationBase):
    id: int
    region: Optional[Region] = None
    assigned_reps: Optional[List[User]] = []
    class Config:
        orm_mode = True
        from_attributes = True

# Doctor
class DoctorBase(BaseModel):
    full_name: str
    is_active: Optional[bool] = True
    contact1: Optional[str] = None
    contact2: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    
    region_id: int
    specialty_id: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    med_org_id: int
    assigned_rep_id: Optional[int] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    contact1: Optional[str] = None
    contact2: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    
    region_id: Optional[int] = None
    specialty_id: Optional[int] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    med_org_id: Optional[int] = None
    assigned_rep_id: Optional[int] = None

class Doctor(DoctorBase):
    id: int
    region: Optional[Region] = None
    specialty: Optional[DoctorSpecialty] = None
    category: Optional[DoctorCategory] = None
    med_org: Optional[MedicalOrganization] = None
    assigned_rep: Optional[User] = None
    
    class Config:
        orm_mode = True
        from_attributes = True

# Balance Transaction
class BalanceTransactionBase(BaseModel):
    organization_id: int
    amount: float
    transaction_type: str
    comment: Optional[str] = None
    related_invoice_id: Optional[int] = None

class BalanceTransaction(BalanceTransactionBase):
    id: int
    created_at: date
    
    class Config:
        from_attributes = True

class OrganizationBalanceTopUp(BaseModel):
    amount: float
    comment: Optional[str] = None
    details: Optional[str] = None  # Bank transaction details, etc.
