
import asyncio
import os
import sys

# Add backend to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.api.v1.endpoints.sales import get_medrep_bonus_balance
from app.models.user import User

async def test_bonus_balance():
    DATABASE_URL = "postgresql+asyncpg://macbook13:@localhost/pharma_db"
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Mock current_user (Admin or Director to avoid 403)
        res = await db.execute(select(User).where(User.role == 'admin'))
        admin = res.scalars().first()
        
        if not admin:
            print("No admin user found for testing")
            return
            
        test_ids = [18, 19, 21, 22, 46]
        for tid in test_ids:
            print(f"Testing ID: {tid}")
            try:
                # Call the logic directly
                # We skip the FastAPI dependency injection by passing db explicitly
                result = await get_medrep_bonus_balance(med_rep_id=tid, db=db, current_user=admin)
                print(f"SUCCESS for ID {tid}: {len(result.get('history', []))} items")
            except Exception as e:
                import traceback
                print(f"FAILED for ID {tid}: {str(e)}")
                traceback.print_exc()
        
if __name__ == "__main__":
    asyncio.run(test_bonus_balance())
