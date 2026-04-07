
import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def check_reservation_item_columns():
    async with AsyncSessionLocal() as db:
        print("Checking columns for 'reservationitem' table...")
        result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'reservationitem'"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Columns found: {columns}")
        
        required = ['marketing_amount', 'salary_amount', 'production_price', 'other_expenses']
        missing = [col for col in required if col not in columns]
        
        if missing:
            print(f"!!! MISSING COLUMNS: {missing}")
            print("Attempting to fix schema...")
            for col in missing:
                try:
                    # Default value is 0.0 for float columns
                    await db.execute(text(f"ALTER TABLE reservationitem ADD COLUMN {col} FLOAT DEFAULT 0.0"))
                    print(f"Successfully added column '{col}'")
                except Exception as e:
                    print(f"Failed to add column '{col}': {e}")
            await db.commit()
            print("Schema fix finalized.")
        else:
            print("All snapshotting columns are present.")

if __name__ == "__main__":
    asyncio.run(check_reservation_item_columns())
