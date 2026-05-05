import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.abspath("backend"))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        entries = result.scalars().all()
        for e in entries:
            if 'аббос' in e.full_name.lower() or 'abbos' in e.full_name.lower() or 'qurbonov' in e.full_name.lower() or 'курбанов' in e.full_name.lower():
                print(f"User ID: {e.id} | Name: {e.full_name} | Phone: {e.phone}")

asyncio.run(check())
