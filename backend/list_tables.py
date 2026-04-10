import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def list_tables():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        tables = [r[0] for r in res.all()]
        print(f"DEBUG Tables: {tables}")

if __name__ == "__main__":
    asyncio.run(list_tables())
