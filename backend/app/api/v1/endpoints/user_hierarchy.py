from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema

router = APIRouter()

@router.get("/{user_id}/hierarchy")
async def get_user_hierarchy(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get the hierarchical structure under a specific user (Product Manager).
    Returns subordinates grouped by role.
    """
    # Verify the user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Level 1: Field Force Managers
    ffm_result = await db.execute(
        select(User).where(User.manager_id == user_id, User.role == UserRole.FIELD_FORCE_MANAGER)
    )
    field_force_managers = ffm_result.scalars().all()
    ffm_ids = [u.id for u in field_force_managers]
    
    # Level 2: Regional Managers (managed by the FFMs)
    regional_managers = []
    rm_ids = []
    if ffm_ids:
        rm_result = await db.execute(
            select(User).where(User.manager_id.in_(ffm_ids), User.role == UserRole.REGIONAL_MANAGER)
        )
        regional_managers = rm_result.scalars().all()
        rm_ids = [u.id for u in regional_managers]
        
    # Level 3: Med Reps (managed by the RMs)
    med_reps = []
    if rm_ids:
        mr_result = await db.execute(
            select(User).where(User.manager_id.in_(rm_ids), User.role == UserRole.MED_REP)
        )
        med_reps = mr_result.scalars().all()
    
    return {
        "user": UserSchema.model_validate(user),
        "field_force_managers": [UserSchema.model_validate(u) for u in field_force_managers],
        "regional_managers": [UserSchema.model_validate(u) for u in regional_managers],
        "med_reps": [UserSchema.model_validate(u) for u in med_reps],
    }
