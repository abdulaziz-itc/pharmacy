import asyncio
import logging
from datetime import datetime, timedelta
from app.db.session import AsyncSessionLocal
from app.models.visit import Visit
from app.models.user import User, UserRole
from app.models.crm import Doctor
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_test_visits() -> None:
    async with AsyncSessionLocal() as db:
        # Get a med rep
        result = await db.execute(select(User).where(User.role == UserRole.MED_REP).limit(1))
        med_rep = result.scalars().first()
        
        if not med_rep:
            logger.info("No med rep found, skipping visit creation")
            return
        
        # Get some doctors
        result = await db.execute(select(Doctor).limit(5))
        doctors = result.scalars().all()
        
        if not doctors:
            logger.info("No doctors found, skipping visit creation")
            return
        
        logger.info(f"Creating test visits for Med Rep: {med_rep.full_name} (ID: {med_rep.id})")
        
        # Create some test visits
        visit_types = ["Плановый", "Внеплановый", "Контрольный"]
        results = ["Успешно", "Отказ", "Перенесен"]
        
        for i, doctor in enumerate(doctors[:3]):
            visit = Visit(
                med_rep_id=med_rep.id,
                doctor_id=doctor.id,
                visit_date=datetime.utcnow() - timedelta(days=i*7),
                visit_type=visit_types[i % len(visit_types)],
                result=results[i % len(results)],
                notes=f"Тестовый визит {i+1}"
            )
            db.add(visit)
        
        await db.commit()
        logger.info("Test visits created successfully!")

def main() -> None:
    logger.info("Creating test visit data")
    asyncio.run(create_test_visits())
    logger.info("Test data created")

if __name__ == "__main__":
    main()
