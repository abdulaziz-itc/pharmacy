import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints import sales
from app.models.user import User, UserRole

async def run():
    async with AsyncSessionLocal() as db:
        # Test as MedRep
        user = User(id=2, role=UserRole.MED_REP) 
        try:
            res = await sales.read_plans(
                db=db, 
                skip=0, 
                limit=100, 
                current_user=user,
                month=3,
                year=2026
            )
            print("MedRep fetch OK, count:", len(res))
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
