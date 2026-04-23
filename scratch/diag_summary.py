from sqlalchemy import text
from app.db.session import AsyncSessionLocal
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        print("--- Global Transaction Type Summary ---")
        
        # 1. Balance Transaction Summary
        res1 = await db.execute(text("SELECT transaction_type, COUNT(*), SUM(amount) FROM balance_transaction GROUP BY transaction_type"))
        print("\nBalance Transactions:")
        for r in res1.all():
            print(f"  Type: {r[0]}, Count: {r[1]}, Total: {r[2]:,.2f}")
            
        # 2. Payment Summary
        res2 = await db.execute(text("SELECT COUNT(*), SUM(amount) FROM payment"))
        r2 = res2.first()
        print(f"\nPayments: Count: {r2[0]}, Total: {r2[1]:,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
