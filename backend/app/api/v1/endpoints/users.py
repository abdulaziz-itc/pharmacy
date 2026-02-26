from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from pydantic.networks import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.config import settings
from app.crud import crud_user
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter()

@router.get("/", response_model=List[UserSchema])
async def read_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    username: Optional[str] = Query(None),
    full_name: Optional[str] = Query(None),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve users. Only for specific roles (e.g., DEPUTY_DIRECTOR).
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    users = await crud_user.get_multi(
        db, skip=skip, limit=limit, username=username, full_name=full_name
    )
    return users

@router.post("/", response_model=UserSchema)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new user.
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    # If the creator is a Product Manager, enforce themselves as the manager if they are creating a subordinate
    if current_user.role == UserRole.PRODUCT_MANAGER:
        if user_in.role not in [UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.MED_REP]:
            raise HTTPException(status_code=400, detail="Product Manager can only create subordinates")
        user_in.manager_id = current_user.id
        
    user = await crud_user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.get("/med-reps")
async def get_med_reps(
    role: Optional[str] = Query(None, description="Filter by role"),
    username: Optional[str] = Query(None),
    full_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get users (optionally filtered by role) with their manager name resolved.
    Used for the medical representatives page with role filter tabs.
    """
    # Get all users to build manager lookup
    all_users_result = await db.execute(select(User))
    all_users = all_users_result.scalars().all()
    
    # Build manager name lookup
    manager_lookup = {u.id: u.full_name for u in all_users}
    
    # Filter by role if specified, otherwise return med_reps by default
    if role:
        filtered = [u for u in all_users if u.role == role]
    else:
        filtered = [u for u in all_users if u.role == UserRole.MED_REP]
    
    if username:
        filtered = [u for u in filtered if username.lower() in u.username.lower()]
    if full_name:
        filtered = [u for u in filtered if full_name.lower() in u.full_name.lower()]
    
    # Build response with manager name
    result = []
    for user in filtered:
        result.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "manager_name": manager_lookup.get(user.manager_id, None) if user.manager_id else None,
        })
    
    return result
