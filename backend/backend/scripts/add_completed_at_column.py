import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def migrate():
    async with AsyncSessionLocal() as db:
        print("Adding 'completed_at' column to 'visitplan' table...")
        try:
            # PostgreSQL syntax to add column if it doesn't exist
            await db.execute(text("""
                ALTER TABLE visitplan 
                ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
            """))
            await db.commit()
            print("Successfully added 'completed_at' column.")
        except Exception as e:
            await db.rollback()
            print(f"Error migrating database: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
