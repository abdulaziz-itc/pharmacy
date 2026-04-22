import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
import json

async def research():
    async with AsyncSessionLocal() as db:
        print("=== RESEARCHING TRANSACTION #427 ===")
        
        # 1. Check Audit Log for #427
        res = await db.execute(text("SELECT * FROM audit_log WHERE target_id = 427 AND target_type = 'BalanceTransaction'"))
        audit = [dict(r._mapping) for r in res.all()]
        print(f"Audit log found: {json.dumps(audit, indent=2, default=str)}")
        
        # 2. Find orphaned Payments around the same time (April 21, 17:19)
        # Using a wider window to be safe
        p_res = await db.execute(text("SELECT * FROM payment WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
        payments = [dict(r._mapping) for r in p_res.all()]
        print(f"Orphaned payments: {json.dumps(payments, indent=2, default=str)}")
        
        # 3. Find orphaned Bonuses
        b_res = await db.execute(text("SELECT * FROM bonusledger WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
        bonuses = [dict(r._mapping) for r in b_res.all()]
        print(f"Orphaned bonuses: {json.dumps(bonuses, indent=2, default=str)}")

if __name__ == "__main__":
    asyncio.run(research())
