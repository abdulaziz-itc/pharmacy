import asyncio
import json
import os
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Possible Database URLs
PG_URL = "postgresql+asyncpg://macbook13@localhost/pharma_db"
SQLITE_PATH = "/Users/macbook13/Documents/pharma_new/backend/db.sqlite3"

async def check_postgres():
    print("\n--- CHECKING POSTGRESQL ---")
    try:
        engine = create_async_engine(PG_URL)
        async with engine.connect() as conn:
            # List tables
            res = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
            tables = [r[0] for r in res.all()]
            print(f"Tables found: {tables}")
            
            # Find ANY audit logs from April 21st (no filter on ID)
            # We search a wide window: April 20 - 22
            a_res = await conn.execute(text("SELECT * FROM auditlog WHERE created_at >= '2026-04-20 00:00:00' AND created_at <= '2026-04-22 23:59:59' ORDER BY created_at DESC LIMIT 50"))
            audit = [dict(r._mapping) for r in a_res.all()]
            print(f"Audit logs (April 20-22): {json.dumps(audit, indent=2, default=str)}")
            
            # Find ANY payments from April 21st
            p_res = await conn.execute(text("SELECT * FROM payment WHERE date >= '2026-04-21 00:00:00' AND date <= '2026-04-21 23:59:59'"))
            payments = [dict(r._mapping) for r in p_res.all()]
            print(f"Payments (April 21): {len(payments)} records found.")
            if payments:
                print(json.dumps(payments[:10], indent=2, default=str))

    except Exception as e:
        print(f"Postgres Error: {e}")

def check_sqlite():
    print("\n--- CHECKING SQLITE ---")
    if not os.path.exists(SQLITE_PATH):
        print(f"SQLite file not found at {SQLITE_PATH}")
        return
    
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        cursor = conn.cursor()
        
        # List tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"Tables found: {tables}")
        
        # Check auditlog if exists
        if 'auditlog' in tables:
            cursor.execute("SELECT * FROM auditlog WHERE created_at LIKE '2026-04-21%' LIMIT 20")
            print(f"SQLite Logs: {cursor.fetchall()}")
        
        conn.close()
    except Exception as e:
        print(f"SQLite Error: {e}")

async def main():
    await check_postgres()
    check_sqlite()

if __name__ == "__main__":
    asyncio.run(main())
