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

def main() -> None:
    logger.info("Creating initial data")
    asyncio.run(init_db())
    logger.info("Initial data created")

if __name__ == "__main__":
    main()
