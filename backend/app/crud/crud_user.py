from typing import Any, Dict, Optional, Union, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserLoginHistory
from app.schemas.user import UserCreate, UserUpdate

async def get(db: AsyncSession, id: int) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.assigned_regions))
        .where(User.id == id)
    )
    return result.scalars().first()

async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.assigned_regions))
        .where(User.username == username.strip())
    )
    return result.scalars().first()

async def get_multi(
    db: AsyncSession, 
    *, 
    skip: int = 0, 
    limit: int = 100,
    username: Optional[str] = None,
    full_name: Optional[str] = None,
    user_ids: Optional[List[int]] = None,
) -> List[User]:
    query = select(User).options(selectinload(User.assigned_regions))
    if username:
        query = query.where(User.username.ilike(f"%{username}%"))
    if full_name:
        query = query.where(User.full_name.ilike(f"%{full_name}%"))
    if user_ids is not None:
        query = query.where(User.id.in_(user_ids))
    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create(db: AsyncSession, obj_in: UserCreate) -> User:
    db_obj = User(
        username=obj_in.username.strip(),
        hashed_password=get_password_hash(obj_in.password),
        full_name=obj_in.full_name,
        role=obj_in.role,
        is_active=obj_in.is_active,
        manager_id=obj_in.manager_id,
    )
    
    if obj_in.region_ids:
        from app.models.crm import Region
        result = await db.execute(select(Region).where(Region.id.in_(obj_in.region_ids)))
        regions = result.scalars().all()
        db_obj.assigned_regions = regions
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update(
    db: AsyncSession, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
) -> User:
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.dict(exclude_unset=True)
    
    if "username" in update_data and update_data["username"]:
        update_data["username"] = update_data["username"].strip()
    
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
        
    region_ids = update_data.pop("region_ids", None)
    if region_ids is not None:
        from app.models.crm import Region
        result = await db.execute(select(Region).where(Region.id.in_(region_ids)))
        regions = result.scalars().all()
        db_obj.assigned_regions = regions
        
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_descendant_ids(db: AsyncSession, user_id: int) -> List[int]:
    """Get all subordinate IDs (recursively) for a given user."""
    all_users = (await db.execute(select(User))).scalars().all()
    manager_to_subs = {}
    for u in all_users:
        if u.manager_id:
            manager_to_subs.setdefault(u.manager_id, []).append(u.id)
            
    descendant_ids = []
    
    def dfs(uid: int):
        for sub_id in manager_to_subs.get(uid, []):
            descendant_ids.append(sub_id)
            dfs(sub_id)
            
    dfs(user_id)
    return descendant_ids

async def get_login_history(
    db: AsyncSession, 
    *, 
    skip: int = 0, 
    limit: int = 100,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> List[UserLoginHistory]:
    query = select(UserLoginHistory).options(selectinload(UserLoginHistory.user))
    
    if year:
        query = query.where(func.extract('year', UserLoginHistory.login_at) == year)
    if month:
        query = query.where(func.extract('month', UserLoginHistory.login_at) == month)
        
    result = await db.execute(
        query
        .order_by(UserLoginHistory.login_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def clear_login_history(db: AsyncSession) -> int:
    """Delete all login history records."""
    from sqlalchemy import delete
    result = await db.execute(delete(UserLoginHistory))
    await db.commit()
    return result.rowcount
