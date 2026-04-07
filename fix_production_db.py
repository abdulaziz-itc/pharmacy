
import asyncio
import logging
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)

async def fix_production_schema():
    """
    Adds missing columns to the reservationitem table in the production database.
    Required for historical cost snapshotting feature.
    """
    async with AsyncSessionLocal() as db:
        logging.info("Checking columns for 'reservationitem' table...")
        
        # Query existing columns
        result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'reservationitem'"))
        columns = [row[0] for row in result.fetchall()]
        logging.info(f"Existing columns: {columns}")
        
        # Columns that might be missing
        required_columns = {
            'marketing_amount': 'FLOAT DEFAULT 0.0',
            'salary_amount': 'FLOAT DEFAULT 0.0',
            'production_price': 'FLOAT DEFAULT 0.0',
            'other_expenses': 'FLOAT DEFAULT 0.0'
        }
        
        missing = [col for col in required_columns if col not in columns]
        
        if not missing:
            logging.info("All required columns are already present. No action needed.")
            return

        logging.info(f"Adding missing columns: {missing}")
        
        for col in missing:
            definition = required_columns[col]
            try:
                logging.info(f"Executing: ALTER TABLE reservationitem ADD COLUMN {col} {definition}")
                await db.execute(text(f"ALTER TABLE reservationitem ADD COLUMN {col} {definition}"))
                logging.info(f"Successfully added column '{col}'")
            except Exception as e:
                logging.error(f"Failed to add column '{col}': {e}")
        
        await db.commit()
        logging.info("Database schema fix completed successfully.")

if __name__ == "__main__":
    asyncio.run(fix_production_schema())
