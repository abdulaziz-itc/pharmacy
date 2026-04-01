import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def check_db():
    async with AsyncSessionLocal() as db:
        # Check visitplan table columns
        result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'visitplan'"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Columns in 'visitplan': {columns}")
        
        # Check if 'status' column exists
        if 'status' not in columns:
            print("WARNING: 'status' column missing in 'visitplan' table!")
        
        # Check if 'notes' column exists
        if 'notes' not in columns:
            print("WARNING: 'notes' column missing in 'visitplan' table!")
            if 'description' in columns:
                print("INFO: 'description' column still exists.")
        
        # Check a few rows
        try:
            result = await db.execute(text("SELECT * FROM visitplan LIMIT 1"))
            row = result.fetchone()
            print(f"Sample row: {row}")
        except Exception as e:
            print(f"Error reading from 'visitplan': {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
