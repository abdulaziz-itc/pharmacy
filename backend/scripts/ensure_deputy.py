
import asyncio
import logging
import sys
import os

# Add backend to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def ensure_deputy_director(password: str = "password") -> None:
    """
    Ensures the 'deputy_director' user exists in the database.
    If it exists, updates the password and ensures it's active.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Check if user exists
            result = await db.execute(select(User).where(User.username == "deputy_director"))
            user = result.scalars().first()
            
            if user:
                logger.info("User 'deputy_director' found. Updating credentials...")
                user.hashed_password = security.get_password_hash(password)
                user.role = UserRole.DEPUTY_DIRECTOR
                user.is_active = True
                db.add(user)
                action = "Updated"
            else:
                logger.info("User 'deputy_director' not found. Creating new account...")
                new_user = User(
                    full_name="Заместитель Директора",
                    username="deputy_director",
                    hashed_password=security.get_password_hash(password),
                    role=UserRole.DEPUTY_DIRECTOR,
                    is_active=True,
                )
                db.add(new_user)
                action = "Created"
            
            await db.commit()
            logger.info(f"SUCCESS: {action} user 'deputy_director' with password: '{password}'")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"FAILURE: Could not ensure deputy director user: {str(e)}")
            raise

if __name__ == "__main__":
    # Allow overriding password via command line argument
    target_password = sys.argv[1] if len(sys.argv) > 1 else "password"
    
    print("-" * 50)
    print("Starting Deputy Director account verification...")
    asyncio.run(ensure_deputy_director(target_password))
    print("-" * 50)
