import asyncio
import os
import sys

# Add backend directory to sys.path so we can import app
sys.path.append("/Users/macbook13/Documents/pharma_new/backend")

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
from app.db.base_class import Base

async def reset_database():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Truncating operational tables...")
        # Get all table names from Base metadata
        tables = [
            "doctor_monthly_stat", "bonus_ledger", "payment", "invoice", "reservationitem", "reservation",
            "stock", "warehouse", "visit", "visit_plan", "notification", 
            "doctor", "doctor_category", "doctor_specialty", "med_org", "region",
            "product", "product_category", "product_manufacturer"
        ]
        
        for table in tables:
            try:
                async with conn.begin_nested():
                    await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                print(f"Truncated {table}")
            except Exception as e:
                print(f"Skipping {table} (Might not exist)")
        
        # Delete all users EXCEPT the first one (Admin)
        await conn.execute(text("DELETE FROM \"user\" WHERE id != 1;"))
        print("Deleted all users except ID=1 (Admin)")
        
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_database())
