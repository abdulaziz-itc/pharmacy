import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_deputy_director() -> None:
    async with AsyncSessionLocal() as db:
        # Check if user exists
        result = await db.execute(select(User).where(User.username == "deputy_director"))
        existing_user = result.scalars().first()
        
        if existing_user:
            logger.info("User 'deputy_director' already exists. Updating password...")
            existing_user.hashed_password = security.get_password_hash("password")
            existing_user.role = UserRole.DEPUTY_DIRECTOR
            existing_user.is_active = True
            db.add(existing_user)
        else:
            logger.info("Creating user 'deputy_director'...")
            new_user = User(
                full_name="Заместитель Директора",
                username="deputy_director",
                hashed_password=security.get_password_hash("password"),
                role=UserRole.DEPUTY_DIRECTOR,
                is_active=True,
            )
            db.add(new_user)
        
        await db.commit()
        logger.info("User 'deputy_director' created/updated successfully with password 'password'")

if __name__ == "__main__":
    asyncio.run(create_deputy_director())
