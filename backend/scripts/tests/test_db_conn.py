import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def test_conn():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            print("Database connection successful!")
    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
