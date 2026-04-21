import asyncio
from sqlalchemy import text
from app.db.session import engine
from app.core.config import settings

async def migrate():
    print(f"Connecting to {settings.DATABASE_URL}...")
    async with engine.begin() as conn:
        # Check if column exists
        try:
            await conn.execute(text("ALTER TABLE payment ADD COLUMN source_payment_id INTEGER REFERENCES payment(id)"))
            print("Successfully added source_payment_id to payment table.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column source_payment_id already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
