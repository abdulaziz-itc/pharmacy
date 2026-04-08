import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

async def create_hrd_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin123"))
        user = result.scalars().first()
        
        if user:
            print(f"User admin123 already exists with role {user.role}")
            # Update password, role, and active status
            user.hashed_password = get_password_hash("admin123")
            user.role = UserRole.HRD
            user.is_active = True
            await db.commit()
            print("Password, role, and active status updated for admin123")
        else:
            new_user = User(
                username="admin123",
                hashed_password=get_password_hash("admin123"),
                full_name="HRD Manager",
                role=UserRole.HRD,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print("User admin123 (HRD) created successfully!")

if __name__ == "__main__":
    asyncio.run(create_hrd_user())
