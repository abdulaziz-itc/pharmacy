import asyncio
from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

async def create_test_medrep():
    async with AsyncSessionLocal() as db:
        username = "test_medrep"
        password = "password123"
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user:
            user = User(
                full_name="Test MedRep",
                username=username,
                hashed_password=security.get_password_hash(password),
                role=UserRole.MED_REP,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"Created MedRep: {username} / {password}")
        else:
            user.hashed_password = security.get_password_hash(password)
            await db.commit()
            print(f"Updated MedRep password: {username} / {password}")

if __name__ == "__main__":
    asyncio.run(create_test_medrep())
