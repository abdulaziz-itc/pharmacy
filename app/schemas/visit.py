from typing import Optional
from pydantic import BaseModel, ConfigDict
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
    med_rep_id: int
    doctor_id: int
    planned_date: datetime
    subject: Optional[str] = None
    description: Optional[str] = None
    visit_type: Optional[str] = "Плановый"

class VisitPlanCreate(VisitPlanBase):
    pass

class VisitPlanUpdate(BaseModel):
    planned_date: Optional[datetime] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    visit_type: Optional[str] = None
    is_completed: Optional[int] = None

class VisitPlanInDBBase(VisitPlanBase):
    id: int
    is_completed: int
    
    model_config = ConfigDict(from_attributes=True)

class VisitPlan(VisitPlanInDBBase):
    pass
