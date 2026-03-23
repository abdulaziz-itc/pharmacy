import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints import sales
from app.models.user import User

async def run():
    async with AsyncSessionLocal() as db:
        user = User(id=1, role="director")
        try:
            res = await sales.read_plans(db=db, skip=0, limit=10, month=3, year=2026, current_user=user)
            print("Plans OK", len(res))
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
