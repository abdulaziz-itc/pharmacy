
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add backend to path to import app models
sys.path.append(os.path.abspath("backend"))

from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://macbook13:@localhost/pharma_db"

async def check_users():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total users: {len(users)}")
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Role: {user.role}, Active: {user.is_active}")

if __name__ == "__main__":
    try:
        asyncio.run(check_users())
    except Exception as e:
        print(f"Error: {e}")
