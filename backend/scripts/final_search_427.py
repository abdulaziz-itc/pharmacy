import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Database URL from config
URL = "postgresql+asyncpg://macbook13@localhost/pharma_db"

async def research():
    engine = create_async_engine(URL)
    async with engine.connect() as conn:
        print("=== RESEARCH RESULTS for #427 (Execution v5) ===")
        
        # 1. Check Audit Log (use 'auditlog' and 'entity_id')
        try:
            # We search for AuditLog with entity_id=427 OR description containing '427'
            res = await conn.execute(text("SELECT id, username, full_name, action, entity_type, entity_id, description, created_at FROM auditlog WHERE entity_id = 427 OR description LIKE '%427%'"))
            audit = [dict(r._mapping) for r in res.all()]
            print(f"\nAUDIT LOGS:\n{json.dumps(audit, indent=2, default=str)}")
        except Exception as e:
            print(f"Error querying auditlog: {e}")
        
        await conn.rollback()

        # 2. Search for Payments around the timestamp (2026-04-21 17:19:01)
        # Using 'date' as found in Payment model
        try:
            p_res = await conn.execute(text("""
                SELECT p.id, p.invoice_id, p.amount, p.date, p.processed_by_id
                FROM payment p
                WHERE p.date >= '2026-04-21 17:00:00' 
                AND p.date <= '2026-04-21 18:00:00'
            """))
            payments = [dict(r._mapping) for r in p_res.all()]
            print(f"\nPOTENTIAL ORPHANED PAYMENTS:\n{json.dumps(payments, indent=2, default=str)}")
        except Exception as e:
            print(f"Error querying payment: {e}")
        
        await conn.rollback()

        # 3. Search for BonusLedger around the same time
        try:
            b_res = await conn.execute(text("""
                SELECT b.id, b.user_id, b.amount, b.ledger_type, b.payment_id, b.created_at, b.notes
                FROM bonus_ledger b
                WHERE b.created_at >= '2026-04-21 17:00:00' 
                AND b.created_at <= '2026-04-21 18:00:00'
            """))
            bonuses = [dict(r._mapping) for r in b_res.all()]
            print(f"\nPOTENTIAL ORPHANED BONUSES:\n{json.dumps(bonuses, indent=2, default=str)}")
        except Exception as e:
            print(f"Error querying bonus_ledger: {e}")

if __name__ == "__main__":
    asyncio.run(research())
