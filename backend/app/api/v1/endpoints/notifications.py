from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.crm import Notification
from app.schemas.notification import Notification as NotificationSchema, NotificationCreate, NotificationUpdate
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve notifications for current user.
    """
    query = select(Notification).where(
        Notification.recipient_id == current_user.id
    ).offset(skip).limit(limit).order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=NotificationSchema)
async def create_notification(
    *,
    db: AsyncSession = Depends(deps.get_db),
    notification_in: NotificationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new notification.
    """
    db_obj = Notification(**notification_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{notification_id}/read", response_model=NotificationSchema)
async def mark_notification_read(
    *,
    db: AsyncSession = Depends(deps.get_db),
    notification_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Mark notification as read.
    """
    result = await db.execute(select(Notification).where(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db_obj.status = "read"
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
