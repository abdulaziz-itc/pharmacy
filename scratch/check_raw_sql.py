import asyncio
import asyncpg
import os

async def check_raw_bt():
    # Attempt to get DB URL from env or fallback to local
    # For this environment, we'll assume the Postgres connection details
    # or just use the local sqlite if it's sqlite.
    # Wait, the app uses Postgres usually. 
    # Let's check alembic.ini for the URL.
    pass

async def main():
    from app.db.session import SessionLocal
    from sqlalchemy import text
    async with SessionLocal() as db:
        # Check distinct transaction types and their counts
        result = await db.execute(text("SELECT transaction_type, COUNT(*) FROM balance_transaction GROUP BY transaction_type"))
        print("--- Transaction Types ---")
        for row in result:
            print(f"Type: '{row[0]}', Count: {row[1]}")
            
        # Check recent transactions in April
        result = await db.execute(text("SELECT id, amount, transaction_type, created_at, comment FROM balance_transaction WHERE created_at >= '2026-04-01' ORDER BY created_at DESC LIMIT 10"))
        print("\n--- Recent Transactions (April) ---")
        for row in result:
            print(f"ID: {row[0]}, Amt: {row[1]}, Type: '{row[2]}', Date: {row[3]}, Comment: {row[4]}")

if __name__ == "__main__":
    asyncio.run(main())
