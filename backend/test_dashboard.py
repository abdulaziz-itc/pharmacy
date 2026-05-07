import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints.analytics import get_global_realtime_dashboard
from app.models.user import User, UserRole

async def check():
    async with AsyncSessionLocal() as db:
        # Mock a user with director role
        class MockUser:
            id = 1
            role = UserRole.DIRECTOR
        
        # We need to call the actual endpoint function
        # But it takes many dependencies. Let's just look at its source code!
        pass
