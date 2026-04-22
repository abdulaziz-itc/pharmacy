import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Database URL from config
URL = "postgresql+asyncpg://macbook13@localhost/pharma_db"

async def research():
    engine = create_async_engine(URL)
    async with engine.connect() as conn:
        print("=== COMPREHENSIVE SCAN FOR APRIL 21-22 ===")
        
        # 1. Broad Audit Search
        # Searching for '427' anywhere in the description or entity_id
        try:
            res = await conn.execute(text("""
                SELECT * FROM auditlog 
                WHERE (entity_id = 427 OR description LIKE '%427%')
                OR (created_at >= '2026-04-21 00:00:00' AND created_at <= '2026-04-21 23:59:59')
                ORDER BY created_at DESC LIMIT 100
            """))
            audit = [dict(r._mapping) for r in res.all()]
            print(f"\nAUDIT LOGS FOUND: {len(audit)}")
            if audit:
                print(json.dumps(audit[:20], indent=2, default=str))
        except Exception as e:
            print(f"Audit Log Error: {e}")
        
        await conn.rollback()

        # 2. Broad Payment Search (April 21st, entire day)
        try:
            p_res = await conn.execute(text("""
                SELECT * FROM payment 
                WHERE (date >= '2026-04-21 00:00:00' AND date <= '2026-04-21 23:59:59')
                OR (id = 427)
            """))
            payments = [dict(r._mapping) for r in p_res.all()]
            print(f"\nPAYMENTS FOUND: {len(payments)}")
            if payments:
                print(json.dumps(payments[:10], indent=2, default=str))
        except Exception as e:
            print(f"Payment Error: {e}")

        await conn.rollback()

        # 3. Broad Bonus Search
        try:
            b_res = await conn.execute(text("""
                SELECT * FROM bonus_ledger 
                WHERE (created_at >= '2026-04-21 00:00:00' AND created_at <= '2026-04-21 23:59:59')
                OR (payment_id = 427)
            """))
            bonuses = [dict(r._mapping) for r in b_res.all()]
            print(f"\nBONUSES FOUND: {len(bonuses)}")
            if bonuses:
                print(json.dumps(bonuses[:10], indent=2, default=str))
        except Exception as e:
            print(f"Bonus Error: {e}")

if __name__ == "__main__":
    asyncio.run(research())
