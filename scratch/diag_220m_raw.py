from sqlalchemy import text
from app.db.session import AsyncSessionLocal
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        print("--- Diagnostic Search for 220,000,000 UZS (Raw SQL) ---")
        
        # 1. Search in balance_transaction
        res1 = await db.execute(text("SELECT * FROM balance_transaction WHERE amount = 220000000"))
        rows1 = res1.all()
        print(f"Found {len(rows1)} BalanceTransactions:")
        for r in rows1:
            print(r)
            
        # 2. Search in payment
        res2 = await db.execute(text("SELECT * FROM payment WHERE amount = 220000000"))
        rows2 = res2.all()
        print(f"Found {len(rows2)} Payments:")
        for r in rows2:
            print(r)

if __name__ == "__main__":
    asyncio.run(check())
