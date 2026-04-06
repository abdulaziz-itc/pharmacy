import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization
from app.schemas.crm import MedicalOrganization as MedicalOrganizationSchema

async def test_orgs():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MedicalOrganization).options(
                selectinload(MedicalOrganization.region),
                selectinload(MedicalOrganization.assigned_reps)
            )
        )
        orgs = result.scalars().all()
        for org in orgs:
            try:
                res = MedicalOrganizationSchema.model_validate(org)
            except Exception as e:
                print(f"FAIL: {org.id} - {e}")
                import traceback
                traceback.print_exc()
                break

if __name__ == "__main__":
    asyncio.run(test_orgs())
