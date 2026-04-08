import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.core import security
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_test_hierarchy() -> None:
    async with AsyncSessionLocal() as db:
        # Get existing product manager
        result = await db.execute(select(User).where(User.role == UserRole.PRODUCT_MANAGER).limit(1))
        pm = result.scalars().first()
        
        if not pm:
            logger.info("No product manager found, creating one...")
            pm = User(
                full_name="Тестовый Менеджер",
                username="testpm",
                hashed_password=security.get_password_hash("password123"),
                role=UserRole.PRODUCT_MANAGER,
                is_active=True,
            )
            db.add(pm)
            await db.commit()
            await db.refresh(pm)
        
        logger.info(f"Using Product Manager: {pm.full_name} (ID: {pm.id})")
        
        # Create Field Force Manager
        ffm = User(
            full_name="Бобур_nn",
            username="Bobur_nn",
            hashed_password=security.get_password_hash("password123"),
            role=UserRole.FIELD_FORCE_MANAGER,
            manager_id=pm.id,
            is_active=True,
        )
        db.add(ffm)
        
        # Create Regional Manager
        rm = User(
            full_name="Асанов Бобур",
            username="Bobur_rm",
            hashed_password=security.get_password_hash("password123"),
            role=UserRole.REGIONAL_MANAGER,
            manager_id=pm.id,
            is_active=True,
        )
        db.add(rm)
        
        # Create Med Rep
        mr = User(
            full_name="Каримов Дилшод",
            username="dilshod_mr",
            hashed_password=security.get_password_hash("password123"),
            role=UserRole.MED_REP,
            manager_id=pm.id,
            is_active=True,
        )
        db.add(mr)
        
        await db.commit()
        logger.info("Test hierarchy created successfully!")

def main() -> None:
    logger.info("Creating test hierarchy data")
    asyncio.run(create_test_hierarchy())
    logger.info("Test data created")

if __name__ == "__main__":
    main()
