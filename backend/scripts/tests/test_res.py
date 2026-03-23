import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints.sales import read_reservation
from app.models.crm import User, UserRole

async def test_read_res():
    async with AsyncSessionLocal() as db:
        try:
            # Mock admin user to bypass ownership checks if any
            mock_user = User(id=1, role=UserRole.ADMIN) 
            res = await read_reservation(reservation_id=15, db=db, current_user=mock_user)
            print("Found:", res.id)
        except Exception as e:
            print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(test_read_res())
