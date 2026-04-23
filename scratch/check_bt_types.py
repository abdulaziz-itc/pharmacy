import asyncio
from app.db.session import SessionLocal
from app.models.crm import BalanceTransaction
from sqlalchemy import select, func

async def check_types():
    async with SessionLocal() as db:
        res = await db.execute(select(BalanceTransaction.transaction_type, func.count('*')).group_by(BalanceTransaction.transaction_type))
        for row in res:
            print(f"Type: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_types())
