import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_director() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "director"))
        user = result.scalars().first()
        
        if user:
            logger.info("User 'director' already exists. Updating password and role...")
            user.hashed_password = security.get_password_hash("director")
            user.role = UserRole.DIRECTOR
            user.is_active = True
        else:
            logger.info("Creating user 'director'...")
            user = User(
                full_name="Director",
                username="director",
                hashed_password=security.get_password_hash("director"),
                role=UserRole.DIRECTOR,
                is_active=True,
            )
            db.add(user)
        
        await db.commit()
        logger.info("User 'director' created/updated successfully with password 'director'")

if __name__ == "__main__":
    asyncio.run(create_director())
