import asyncio
from app.db.session import async_session
from sqlalchemy import select
from app.models.crm import MedicalOrganization

async def get_orgs():
    async with async_session() as session:
        result = await session.execute(select(MedicalOrganization))
        orgs = result.scalars().all()
        for org in orgs:
            print(org.id, org.org_type)

if __name__ == "__main__":
    asyncio.run(get_orgs())
