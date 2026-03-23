import asyncio
from sqlalchemy import inspect
from app.db.session import engine
from app.models.ledger import BonusLedger

async def run():
    async def get_columns(connection):
        def sync_inspect(conn):
            inspector = inspect(conn)
            return inspector.get_columns('bonus_ledger')
        return await connection.run_sync(sync_inspect)

    async with engine.connect() as conn:
        columns = await get_columns(conn)
        print("Columns in 'bonus_ledger' table:")
        for col in columns:
            print(f" - {col['name']}")

asyncio.run(run())
