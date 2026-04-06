import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation
from app.models.crm import MedicalOrganization

async def main():
    async with AsyncSessionLocal() as db:
        query = select(Invoice, Reservation).join(Reservation, Invoice.reservation_id == Reservation.id).where(Invoice.paid_amount > Invoice.total_amount)
        result = await db.execute(query)
        invoices = result.all()
        for inv, res in invoices:
            print(f"Overpaid Invoice: {inv.id}, Total: {inv.total_amount}, Paid: {inv.paid_amount}, Org: {res.med_org_id}")

        print("---")
        orgs = await db.execute(select(MedicalOrganization).where(MedicalOrganization.credit_balance > 0))
        for org in orgs.scalars().all():
            print(f"Org {org.id} ({org.name}) has credit: {org.credit_balance}")

if __name__ == "__main__":
    asyncio.run(main())
