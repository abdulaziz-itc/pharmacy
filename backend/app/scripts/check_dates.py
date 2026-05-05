"""
Check dates in database.
"""
import asyncio, os, sys
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = (await db.execute(select(Payment))).scalars().all()
        print(f"Total payments in local database: {len(res)}")
        for p in res[-20:]:
            print(f"ID: {p.id}, Date: {p.date}, Amount: {p.amount}")

if __name__ == "__main__":
    asyncio.run(main())
