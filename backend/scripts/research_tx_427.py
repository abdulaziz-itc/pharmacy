import asyncio
from sqlalchemy import text
from app.db.session import engine
from app.core.config import settings

async def check():
    async with engine.connect() as conn:
        print(f"Searching for Audit Logs for ID 427...")
        # Check for BalanceTransaction #427
        res = await conn.execute(text("SELECT * FROM audit_log WHERE target_id = 427 AND target_type = 'BalanceTransaction' ORDER BY created_at DESC"))
        rows = res.mappings().all()
        for row in rows:
            print("-" * 20)
            print(f"Action: {row['action']}")
            print(f"Created At: {row['created_at']}")
            print(f"Before: {row['state_before']}")
            print(f"After: {row['state_after']}")

if __name__ == "__main__":
    asyncio.run(check())
