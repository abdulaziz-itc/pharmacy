import asyncio
import os
import sys

# Setup paths before imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints.analytics import get_comprehensive_stats
from app.models.user import User, UserRole

async def main():
    async with AsyncSessionLocal() as db:
        # Dummy accountant
        user = User(id=7, role=UserRole.ACCOUNTANT)
        
        try:
            res = await get_comprehensive_stats(
                db=db,
                current_user=user,
                month=4,
                year=2026
            )
            print("Success!")
            # print(repr(res)[:100])
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
