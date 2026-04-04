import asyncio
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.session import async_session_maker
from sqlalchemy import select
from app.models.sales import Reservation

async def run():
    async with async_session_maker() as db:
        res = await db.execute(select(Reservation.created_by_id).distinct())
        print("Reservation Creators:", res.scalars().all())

asyncio.run(run())
