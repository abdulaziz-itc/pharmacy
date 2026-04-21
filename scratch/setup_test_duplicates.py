
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization, Region

async def create_test_duplicates():
    async with AsyncSessionLocal() as db:
        # Get a region
        res = await db.execute(select(Region).limit(1))
        region = res.scalar_one_or_none()
        if not region:
            print("No regions found, creating one...")
            region = Region(name="Test Region")
            db.add(region)
            await db.commit()
            await db.refresh(region)
        
        # Create triple duplicates
        for i in range(3):
            org = MedicalOrganization(
                name="DUP_TEST_ORG",
                inn="999888777",
                region_id=region.id,
                credit_balance=1000.0 * (i + 1)
            )
            db.add(org)
        
        await db.commit()
        print("Created 3 duplicate organizations named 'DUP_TEST_ORG'")

if __name__ == "__main__":
    asyncio.run(create_test_duplicates())
