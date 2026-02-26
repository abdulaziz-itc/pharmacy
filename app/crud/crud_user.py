from typing import Any, Dict, Optional, Union, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

async def get(db: AsyncSession, id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == id))
    return result.scalars().first()

async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()

async def get_multi(
    db: AsyncSession, 
    *, 
    skip: int = 0, 
    limit: int = 100,
    username: Optional[str] = None,
    full_name: Optional[str] = None,
) -> List[User]:
    query = select(User)
    if username:
        query = query.where(User.username.ilike(f"%{username}%"))
    if full_name:
        query = query.where(User.full_name.ilike(f"%{full_name}%"))
    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create(db: AsyncSession, obj_in: UserCreate) -> User:
    db_obj = User(
        username=obj_in.username,
        hashed_password=get_password_hash(obj_in.password),
        full_name=obj_in.full_name,
        role=obj_in.role,
        is_active=obj_in.is_active,
        manager_id=obj_in.manager_id,
    )
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
    
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
        
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
