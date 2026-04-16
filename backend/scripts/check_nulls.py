
import asyncio
import os
import sys

# Add backend to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models.ledger import BonusLedger

async def check_nulls():
    DATABASE_URL = "postgresql+asyncpg://macbook13:@localhost/pharma_db"
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        res = await db.execute(select(func.count(BonusLedger.id)).where(BonusLedger.created_at == None))
        count = res.scalar()
        print(f"Null created_at: {count}")
        
if __name__ == "__main__":
    asyncio.run(check_nulls())
