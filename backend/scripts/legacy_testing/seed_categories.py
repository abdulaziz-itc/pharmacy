import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.models.crm import DoctorCategory
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_categories() -> None:
    async with AsyncSessionLocal() as db:
        categories = ["VIP", "A", "B"]
        
        for cat_name in categories:
            result = await db.execute(select(DoctorCategory).where(DoctorCategory.name == cat_name))
            existing_cat = result.scalars().first()
            
            if not existing_cat:
                new_cat = DoctorCategory(name=cat_name)
                db.add(new_cat)
                logger.info(f"Creating category: {cat_name}")
            else:
                logger.info(f"Category already exists: {cat_name}")
        
        await db.commit()
        logger.info("Categories seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_categories())
