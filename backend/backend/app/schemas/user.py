from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from app.models.user import UserRole

# Shared properties
class UserBase(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[UserRole] = UserRole.MED_REP
    manager_id: Optional[int] = None
    region_ids: List[int] = []

    @field_validator("region_ids", mode="before")
    @classmethod
    def extract_region_ids(cls, v: Any) -> List[int]:
        if isinstance(v, list) and v and not isinstance(v[0], int):
            return [r.id for r in v]
        return v or []

# Properties to receive via API on creation
class UserCreate(UserBase):
    username: str
    password: str
    full_name: str
    role: UserRole
    manager_id: Optional[int] = None

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class User(UserInDBBase):
    pass

# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str

# Login History
class UserLoginHistory(BaseModel):
    id: int
    user_id: int
    login_at: datetime
    ip_address: Optional[str] = None
    location: Optional[str] = None
    user_agent: Optional[str] = None
    user: Optional[User] = None

    model_config = ConfigDict(from_attributes=True)
