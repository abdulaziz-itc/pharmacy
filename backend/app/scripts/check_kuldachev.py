import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check_kuldachev():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).limit(20))
        users = res.scalars().all()
        print("Listing top 20 users in the DB:")
        for u in users:
            print(f"[{u.id}] Name: '{u.full_name}', Role: {u.role}, ManagerID: {u.manager_id}")

if __name__ == "__main__":
    asyncio.run(check_kuldachev())
