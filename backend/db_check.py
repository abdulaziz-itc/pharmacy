import asyncio
from app.db.session import engine
from sqlalchemy import inspect

async def check():
    print("Connecting to database...")
    async with engine.connect() as conn:
        def get_tables(connection):
            inspector = inspect(connection)
            return inspector.get_table_names()
        
        tables = await conn.run_sync(get_tables)
        print("\nExisting tables:", tables)
        
        required_tables = ['doctor_fact_assignment', 'unassigned_sale', 'audit_log', 'reservation', 'invoice']
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            print("\n❌ MISSING TABLES:", missing_tables)
        else:
            print("\n✅ All required tables exist.")
            
        if 'reservation' in tables:
            def get_cols(connection):
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('reservation')]
            
            res_cols = await conn.run_sync(get_cols)
            required_res_cols = ['is_deletion_pending', 'source_invoice_id', 'is_bonus_eligible']
            missing_res_cols = [c for c in required_res_cols if c not in res_cols]
            if missing_res_cols:
                print("❌ MISSING COLUMNS in 'reservation':", missing_res_cols)
            else:
                print("✅ 'reservation' columns are up to date.")

if __name__ == "__main__":
    asyncio.run(check())
