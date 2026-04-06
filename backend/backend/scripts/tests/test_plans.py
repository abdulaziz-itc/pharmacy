import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints import sales
from app.models.user import User
from pydantic import TypeAdapter
from typing import List
from app.schemas.sales import Plan

async def run():
    async with AsyncSessionLocal() as db:
        user = User(id=1, role="director")
        try:
            # 1. Fetch raw models
            res = await sales.read_plans(db=db, skip=0, limit=10000, month=3, year=2026, current_user=user)
            print("Raw db fetch OK, count:", len(res))
            
            # 2. Pydantic validation (this happens inside FastAPI router)
            ta = TypeAdapter(List[Plan])
            validated = ta.validate_python(res)
            print("Pydantic validation OK!")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
