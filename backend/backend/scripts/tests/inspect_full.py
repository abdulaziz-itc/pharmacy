import asyncio
from sqlalchemy import inspect
from app.db.session import engine
from app.db.base import Base

async def run():
    async with engine.connect() as conn:
        def sync_inspect(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names()
            for table in tables:
                print(f"Table: {table}")
                columns = inspector.get_columns(table)
                for col in columns:
                    print(f" - {col['name']}")
        
        await conn.run_sync(sync_inspect)

asyncio.run(run())
