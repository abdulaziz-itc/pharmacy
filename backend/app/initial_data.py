import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalars().first()
        
        if not user:
            user_in = User(
                full_name="Initial Admin",
                username="admin",
                hashed_password=security.get_password_hash("admin"),
                role=UserRole.DEPUTY_DIRECTOR,
                is_active=True,
            )
            db.add(user_in)
            await db.commit()
            logger.info("Superuser created")
        else:
            logger.info("Superuser already exists")

        # HRD Account
        result = await db.execute(select(User).where(User.username == "admin123"))
        hrd_user = result.scalars().first()
        if not hrd_user:
            hrd_in = User(
                full_name="HRD Manager",
                username="admin123",
                hashed_password=security.get_password_hash("admin123"),
                role=UserRole.HRD,
                is_active=True,
            )
            db.add(hrd_in)
            await db.commit()
            logger.info("HRD account (admin123) created")
        else:
            # Ensure it's active and has correct role/password for easy access
            hrd_user.is_active = True
            hrd_user.role = UserRole.HRD
            hrd_user.hashed_password = security.get_password_hash("admin123")
            await db.commit()
            logger.info("HRD account (admin123) updated/verified")

def main() -> None:
    logger.info("Creating initial data")
    asyncio.run(init_db())
    logger.info("Initial data created")

if __name__ == "__main__":
    main()
