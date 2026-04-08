from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from .user import User

class NotificationBase(BaseModel):
    topic: str
    message: str
    recipient_id: int
    status: Optional[str] = "unread"
    related_entity_type: Optional[str] = None
    related_entity_name: Optional[str] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(NotificationBase):
    status: Optional[str] = None

class Notification(NotificationBase):
    id: int
    created_at: datetime
    recipient: Optional[User] = None

    class Config:
        from_attributes = True
