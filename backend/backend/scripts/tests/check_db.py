import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.warehouse import Warehouse

async def check():
    async with SessionLocal() as db:
        result = await db.execute(select(Warehouse))
        warehouses = result.scalars().all()
        print(f"Found {len(warehouses)} warehouses")
        for w in warehouses:
            print(f"ID: {w.id}, Name: {w.name}")

if __name__ == "__main__":
    asyncio.run(check())
