
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization
from app.models.sales import Invoice, Reservation, InvoiceStatus

async def debug_endpoint_logic():
    async with AsyncSessionLocal() as db:
        query = select(MedicalOrganization)
        result = await db.execute(query)
        orgs = result.scalars().all()
        
        print(f"Number of orgs from scalars().all(): {len(orgs)}")
        for i, org in enumerate(orgs):
            print(f"{i}: ID={org.id}, Name={org.name}")

        # Check if using .all() instead of .scalars().all() makes a difference
        result2 = await db.execute(query)
        rows = result2.all()
        print(f"Number of rows from .all(): {len(rows)}")

if __name__ == "__main__":
    asyncio.run(debug_endpoint_logic())
