from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from .crm import Doctor, MedicalOrganization

class VisitPlanBase(BaseModel):
    planned_date: datetime
    subject: Optional[str] = None
    description: Optional[str] = None
    visit_type: Optional[str] = None
    doctor_id: Optional[int] = None
    med_org_id: Optional[int] = None
    status: Optional[str] = "planned"

class VisitPlanCreate(VisitPlanBase):
    med_rep_id: int

class VisitPlanUpdate(VisitPlanBase):
    pass

class VisitPlan(VisitPlanBase):
    id: int
    med_rep_id: int
    # Assuming Doctor and MedicalOrganization are defined elsewhere or will be imported
    # from .doctor import Doctor
    # from .medical_organization import MedicalOrganization
    doctor: Optional[Doctor] = None
    med_org: Optional[MedicalOrganization] = None
    status: Optional[str] = None # pending, completed, cancelled

    class Config:
        from_attributes = True
