
import asyncio
import os
import sys

# Set up the environment
sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))

from app.db.session import AsyncSessionLocal
from app.models.visit import VisitPlan
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def test_visit_plans():
    async with AsyncSessionLocal() as db:
        try:
            query = select(VisitPlan).options(
                selectinload(VisitPlan.doctor),
                selectinload(VisitPlan.med_org)
            )
            result = await db.execute(query)
            plans = result.scalars().all()
            print(f"SUCCESS: Found {len(plans)} plans")
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_visit_plans())
