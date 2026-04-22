import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

URL = "postgresql+asyncpg://macbook13@localhost/pharma_db"

async def go():
    engine = create_async_engine(URL)
    async with engine.connect() as conn:
        print("--- AUDIT LOG CHECK ---")
        res = await conn.execute(text("SELECT id, username, action, entity_type, entity_id, description, created_at FROM auditlog WHERE entity_id = 427 OR description LIKE '%427%'"))
        print(json.dumps([dict(r._mapping) for r in res.all()], indent=2, default=str))

        print("\n--- PAYMENT CHECK ---")
        res = await conn.execute(text("SELECT * FROM payment WHERE id = 427 OR amount BETWEEN 1000 AND 100000000")) # Broad search
        # We'll filter for payments created on April 21
        payments = [dict(r._mapping) for r in res.all() if r._mapping['date'].date().isoformat() == '2026-04-21']
        print(f"Found {len(payments)} payments on April 21.")
        print(json.dumps(payments, indent=2, default=str))

        print("\n--- BONUS LEDGER CHECK ---")
        res = await conn.execute(text("SELECT * FROM bonus_ledger WHERE created_at >= '2026-04-21 00:00:00'"))
        print(json.dumps([dict(r._mapping) for r in res.all()], indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(go())
