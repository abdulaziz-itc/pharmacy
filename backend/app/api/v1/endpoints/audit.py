from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime

from app.api import deps
from app.models.user import User, UserRole
from app.models.audit import AuditLog

router = APIRouter()


@router.get("/audit-logs/")
async def get_audit_logs(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
    username: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),   # YYYY-MM-DD
    date_to: Optional[str] = Query(None),      # YYYY-MM-DD
    ip_address: Optional[str] = Query(None),
) -> Any:
    """
    Retrieve audit logs. Only accessible by Director, Deputy Director, and Admin.
    """
    from fastapi import HTTPException
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    from sqlalchemy import func
    count_query = select(func.count()).select_from(AuditLog)
    query = select(AuditLog).order_by(desc(AuditLog.created_at))

    if username:
        count_query = count_query.where(AuditLog.username.ilike(f"%{username}%"))
        query = query.where(AuditLog.username.ilike(f"%{username}%"))
    if action:
        count_query = count_query.where(AuditLog.action == action)
        query = query.where(AuditLog.action == action)
    if entity_type:
        count_query = count_query.where(AuditLog.entity_type == entity_type)
        query = query.where(AuditLog.entity_type == entity_type)
    if ip_address:
        count_query = count_query.where(AuditLog.ip_address.ilike(f"%{ip_address}%"))
        query = query.where(AuditLog.ip_address.ilike(f"%{ip_address}%"))
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            count_query = count_query.where(AuditLog.created_at >= dt_from)
            query = query.where(AuditLog.created_at >= dt_from)
        except ValueError: pass
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            count_query = count_query.where(AuditLog.created_at <= dt_to)
            query = query.where(AuditLog.created_at <= dt_to)
        except ValueError: pass

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()


    return {
        "items": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "username": l.username,
                "full_name": l.full_name,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "description": l.description,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total
    }



@router.get("/audit-logs/actions/")
async def get_audit_actions(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Return distinct action types for filter dropdown."""
    from fastapi import HTTPException
    from sqlalchemy import distinct
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(distinct(AuditLog.action)).where(AuditLog.action != None))
    return [row[0] for row in result.all()]


@router.delete("/audit-logs/")
async def delete_audit_logs(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Clear all audit logs. Only accessible by Director and Admin.
    """
    from fastapi import HTTPException
    from sqlalchemy import delete
    
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions to clear logs.")
    
    await db.execute(delete(AuditLog))
    await db.commit()
    
    return {"message": "All audit logs have been cleared."}
