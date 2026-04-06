from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
import asyncio

async def list_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for user in users:
            print(f"Username: {user.username}, Role: {user.role}, Active: {user.is_active}")

if __name__ == "__main__":
    asyncio.run(list_users())
