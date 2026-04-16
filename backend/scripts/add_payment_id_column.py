import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def add_column():
    print(f"Connecting to database...")
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Checking for 'payment_id' column in 'balance_transaction' table...")
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='balance_transaction' AND column_name='payment_id';
        """)
        result = await conn.execute(check_query)
        column_exists = result.fetchone() is not None
        
        if not column_exists:
            print("Column 'payment_id' not found. Adding it...")
            await conn.execute(text("ALTER TABLE balance_transaction ADD COLUMN payment_id INTEGER REFERENCES payment(id) NULL;"))
            print("Successfully added 'payment_id' column.")
        else:
            print("Column 'payment_id' already exists.")
            
    await engine.dispose()
    print("Done.")

if __name__ == "__main__":
    asyncio.run(add_column())
