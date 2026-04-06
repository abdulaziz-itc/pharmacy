import asyncio
import os
import sys

sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))
from app.db.session import AsyncSessionLocal
from app.models.user import User

async def test():
    async with AsyncSessionLocal() as db:
        user = User(username="test_user_attr", hashed_password="pwd", full_name="Test User")
        db.add(user)
        await db.flush()
        
        try:
            print("Trying to read assigned_regions...")
            regions = user.assigned_regions
            print("OK. Len:", len(regions))
        except Exception as e:
            print("Failed assigned_regions:", e)

asyncio.run(test())
