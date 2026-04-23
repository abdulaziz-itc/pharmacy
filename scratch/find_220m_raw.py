from sqlalchemy import select, func, text
from app.db.session import AsyncSessionLocal
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # Check raw transactions with amount 220,000,000
        res = await db.execute(text("SELECT id, organization_id, amount, transaction_type, created_at FROM balance_transaction WHERE amount = 220000000"))
        rows = res.all()
        print(f"Found {len(rows)} raw BalanceTransactions with 220,000,000:")
        for r in rows:
            print(r)
            
        # Also check Payment table just in case
        res_p = await db.execute(text("SELECT id, amount, date FROM payment WHERE amount = 220000000"))
        prows = res_p.all()
        print(f"\nFound {len(prows)} raw Payments with 220,000,000:")
        for r in prows:
            print(r)

if __name__ == "__main__":
    asyncio.run(check())
