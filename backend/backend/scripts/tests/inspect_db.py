import asyncio
from sqlalchemy import inspect
from app.db.session import engine
from app.models.sales import Reservation

async def run():
    async def get_columns(connection):
        def sync_inspect(conn):
            inspector = inspect(conn)
            return inspector.get_columns('reservation')
        return await connection.run_sync(sync_inspect)

    async with engine.connect() as conn:
        columns = await get_columns(conn)
        print("Columns in 'reservation' table:")
        for col in columns:
            print(f" - {col['name']}")

asyncio.run(run())
