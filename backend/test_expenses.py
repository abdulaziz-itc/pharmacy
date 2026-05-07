import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func
from app.models.finance import OtherExpense

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(func.sum(OtherExpense.amount)))
        print("Total Expenses (ALL TIME):", res.scalar())

asyncio.run(check())
