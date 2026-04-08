import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    from sqlalchemy import text
    async with AsyncSessionLocal() as db:
        # FAILSAFE: Ensure tables exist if Alembic failed
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS userloginhistory (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR,
                location VARCHAR,
                user_agent VARCHAR
            );
        """))
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_regions (
                user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                region_id INTEGER NOT NULL REFERENCES region(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, region_id)
            );
        """))
        await db.commit()

        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalars().first()
        
        if not user:
            user_in = User(
                full_name="Initial Admin",
                username="admin",
                hashed_password=security.get_password_hash("admin"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(user_in)
            await db.commit()
            logger.info("Superuser created")
        else:
            # Fix role if it was incorrectly set to DEPUTY_DIRECTOR
            if user.role != UserRole.ADMIN:
                user.role = UserRole.ADMIN
                await db.commit()
                logger.info("Admin role corrected to ADMIN")
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

        # Investor (Owner) account
        result = await db.execute(select(User).where(User.username == "owner"))
        owner_user = result.scalars().first()
        if not owner_user:
            owner_in = User(
                full_name="Owner",
                username="owner",
                hashed_password=security.get_password_hash("password"),
                role=UserRole.INVESTOR,
                is_active=True,
            )
            db.add(owner_in)
            await db.commit()
            logger.info("Owner (investor) account created")
        else:
            owner_user.is_active = True
            owner_user.role = UserRole.INVESTOR
            owner_user.hashed_password = security.get_password_hash("password")
            await db.commit()
            logger.info("Owner (investor) account updated/verified")

def main() -> None:
    logger.info("Creating initial data")
    asyncio.run(init_db())
    logger.info("Initial data created")

if __name__ == "__main__":
    main()
