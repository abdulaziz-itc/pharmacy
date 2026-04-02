
import sys
import os
import asyncio
sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
from app.api.v1.endpoints.visit_plans import get_visit_plans
from app.schemas.visit_plan import VisitPlan as VisitPlanSchema

async def main():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.username=="test_med_rep"))).scalars().first()
        if not user:
            print("User not found")
            return
            
        print("Got User ID:", user.id)

        plans = await get_visit_plans(db=db, current_user=user, med_rep_id=None)
        
        # Serialize like FastAPI does
        from fastapi.encoders import jsonable_encoder
        json_data = jsonable_encoder(plans)
        
        print("---- JSON DUMP ----")
        import json
        print(json.dumps(json_data, indent=2))
        
        if len(plans) > 0:
            print("First planned_date:", plans[0].planned_date)

asyncio.run(main())
