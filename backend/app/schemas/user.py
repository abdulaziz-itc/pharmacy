from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole

# Shared properties
class UserBase(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[UserRole] = UserRole.MED_REP
    manager_id: Optional[int] = None

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
