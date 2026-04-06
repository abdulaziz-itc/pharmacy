import asyncio
import os
import sys

sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))
from app.db.session import AsyncSessionLocal
from app.models.visit import VisitPlan
from sqlalchemy import select

async def test():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(VisitPlan).limit(1))
        plan = result.scalars().first()
        if plan:
            print(f"planned_date string from db: {plan.planned_date}")
            print(f"type: {type(plan.planned_date)}")
        else:
            print("No plans found")

asyncio.run(test())
