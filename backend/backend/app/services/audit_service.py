"""
Audit log helper — call `log_action(...)` inside any endpoint to record an action.
"""
from datetime import datetime
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


async def log_action(
    db: AsyncSession,
    current_user: User,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    description: str = None,
    request: Request = None,
) -> None:
    """Insert an audit log row. Never raises — failures are silently ignored."""
    try:
        ip = None
        ua = None
        if request:
            # Try X-Forwarded-For first (reverse proxy), then direct IP
            forwarded = request.headers.get("x-forwarded-for")
            ip = forwarded.split(",")[0].strip() if forwarded else (
                request.client.host if request.client else None
            )
            ua = request.headers.get("user-agent")

        entry = AuditLog(
            user_id=current_user.id if current_user else None,
            username=current_user.username if current_user else None,
            full_name=current_user.full_name if current_user else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            ip_address=ip,
            user_agent=ua,
            created_at=datetime.utcnow(),
        )
        db.add(entry)
        await db.commit()
    except Exception:
        pass  # Audit log must never break the main flow
