
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization

async def check_duplicates():
    async with AsyncSessionLocal() as session:
        # Check totals
        result = await session.execute(select(func.count(MedicalOrganization.id)))
        total = result.scalar()
        print(f"Total organizations: {total}")
        
        # Check for duplicate names/INNs
        result = await session.execute(
            select(MedicalOrganization.name, MedicalOrganization.inn, func.count(MedicalOrganization.id))
            .group_by(MedicalOrganization.name, MedicalOrganization.inn)
            .having(func.count(MedicalOrganization.id) > 1)
        )
        duplicates = result.all()
        print(f"Duplicates found (Name, INN, Count): {duplicates}")

if __name__ == "__main__":
    asyncio.run(check_duplicates())
