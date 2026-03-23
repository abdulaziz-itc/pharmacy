import asyncio
from sqlalchemy import inspect
from app.db.session import engine

async def run():
    async with engine.connect() as conn:
        cols = await conn.run_sync(lambda c: inspect(c).get_columns('product'))
        for col in cols:
            print(f"Product Col: {col['name']}")

asyncio.run(run())
