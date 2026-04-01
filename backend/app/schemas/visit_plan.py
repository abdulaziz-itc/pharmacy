from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, computed_field, Field, AliasChoices
from .crm import Doctor, MedicalOrganization

class VisitPlanBase(BaseModel):
    planned_date: datetime
    subject: Optional[str] = None
    notes: Optional[str] = Field(None, validation_alias=AliasChoices('notes', 'description'))
    visit_type: Optional[str] = None
    doctor_id: Optional[int] = None
    med_org_id: Optional[int] = None
    status: Optional[str] = "planned"

class VisitPlanCreate(VisitPlanBase):
    is_completed: Optional[bool] = None

class VisitPlanUpdate(VisitPlanBase):
    is_completed: Optional[bool] = None

class VisitPlan(VisitPlanBase):
    id: int
    med_rep_id: int
    doctor: Optional[Doctor] = None
    med_org: Optional[MedicalOrganization] = None
    status: Optional[str] = None # pending, completed, cancelled

    @computed_field
    @property
    def is_completed(self) -> bool:
        return self.status == "completed"

    class Config:
        from_attributes = True
