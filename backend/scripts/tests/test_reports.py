import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints import reports
from datetime import date
from fastapi import Request
from app.models.user import User

async def run():
    async with AsyncSessionLocal() as db:
        user = User(id=1, role="director")
        req = Request(scope={"type": "http"})
        try:
            res = await reports.get_comprehensive_reports(
                request=req,
                db=db,
                current_user=user,
                start_date=date(2026, 3, 1),
                end_date=date(2026, 3, 31),
                period="monthly"
            )
            print("OK", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
