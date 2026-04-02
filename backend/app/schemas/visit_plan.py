from typing import Optional, List, Any
from datetime import datetime
try:
    from pydantic import BaseModel, computed_field, Field, AliasChoices
    ConfigDict = None # Not needed for this file as it uses class Config
except ImportError:
    # Fallback for Pydantic v1
    from pydantic import BaseModel, Field
    from pydantic import validator as computed_field
    AliasChoices = None
from .crm import Doctor, MedicalOrganization
from .user import UserBase

class VisitPlanBase(BaseModel):
    planned_date: datetime
    subject: Optional[str] = None
    notes: Optional[str] = Field(None, validation_alias=AliasChoices('notes', 'description')) if AliasChoices else Field(None, alias='description')
    visit_type: Optional[str] = None
    doctor_id: Optional[int] = None
    med_org_id: Optional[int] = None
    status: Optional[str] = "planned"

class VisitPlanCreate(VisitPlanBase):
    med_rep_id: Optional[int] = None
    is_completed: Optional[bool] = None

class VisitPlanUpdate(VisitPlanBase):
    is_completed: Optional[bool] = None

class VisitPlan(VisitPlanBase):
    id: int
    med_rep_id: int
    med_rep: Optional[UserBase] = None
    doctor: Optional[Doctor] = None
    med_org: Optional[MedicalOrganization] = None
    status: Optional[str] = None # pending, completed, cancelled

    if computed_field and hasattr(computed_field, '__name__') and computed_field.__name__ == 'computed_field':
        @computed_field
        @property
        def is_completed(self) -> bool:
            return self.status == "completed"
    else:
        @property
        def is_completed(self) -> bool:
            return self.status == "completed"

    class Config:
        orm_mode = True
        from_attributes = True
