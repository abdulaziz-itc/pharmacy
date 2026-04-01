from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, computed_field, Field
from datetime import datetime

# Visit Schemas
class VisitBase(BaseModel):
    med_rep_id: int
    doctor_id: int
    visit_type: str
    result: Optional[str] = None
    notes: Optional[str] = None

class VisitCreate(VisitBase):
    visit_date: Optional[datetime] = None

class VisitUpdate(BaseModel):
    visit_type: Optional[str] = None
    result: Optional[str] = None
    notes: Optional[str] = None

class VisitInDBBase(VisitBase):
    id: int
    visit_date: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Visit(VisitInDBBase):
    pass

# Visit Plan Schemas
class VisitPlanBase(BaseModel):
    med_rep_id: Optional[int] = None
    doctor_id: Optional[int] = None
    med_org_id: Optional[int] = None
    planned_date: datetime
    subject: Optional[str] = None
    notes: Optional[str] = Field(None, validation_alias='description')
    visit_type: Optional[str] = "Плановый"
    status: Optional[str] = "planned"

class VisitPlanCreate(VisitPlanBase):
    pass

class VisitPlanUpdate(BaseModel):
    planned_date: Optional[datetime] = None
    subject: Optional[str] = None
    notes: Optional[str] = Field(None, validation_alias='description')
    visit_type: Optional[str] = None
    is_completed: Optional[int] = None

class VisitPlanInDBBase(VisitPlanBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class VisitPlan(VisitPlanInDBBase):
    @computed_field
    @property
    def is_completed(self) -> bool:
        return self.status == "completed"
