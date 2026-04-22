import asyncio
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Possible Database URLs
URLS = [
    "postgresql+asyncpg://macbook13@localhost/pharma_db", # Found in config.py
    "postgresql+asyncpg://joidauz@localhost/joida_db",     # Joyida fallback?
]

async def probe():
    results = {}
    for url in URLS:
        print(f"Probing {url}...")
        try:
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                # Find Audit Log for #427
                res = await conn.execute(text("SELECT id, state_before, state_after FROM audit_log WHERE target_id = 427 AND target_type = 'BalanceTransaction'"))
                audit = [dict(r) for r in res.mappings().all()]
                
                # Find Orphans around 2026-04-21 17:19:01
                p_res = await conn.execute(text("SELECT * FROM payment WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
                payments = [dict(r) for r in p_res.mappings().all()]
                
                b_res = await conn.execute(text("SELECT * FROM bonusledger WHERE created_at >= '2026-04-21 17:15:00' AND created_at <= '2026-04-21 17:25:00'"))
                bonuses = [dict(r) for r in b_res.mappings().all()]
                
                results[url] = {
                    "audit": audit,
                    "payments": payments,
                    "bonuses": bonuses
                }
            await engine.dispose()
        except Exception as e:
            results[url] = {"error": str(e)}
            
    with open("/Users/macbook13/Documents/pharma_new/backend/tx_427_discovery.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

if __name__ == "__main__":
    asyncio.run(probe())
