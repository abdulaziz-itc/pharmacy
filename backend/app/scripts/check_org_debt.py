import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment
from app.models.crm import MedicalOrganization
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Find the organization
        org_q = select(MedicalOrganization).where(MedicalOrganization.name.ilike('%ЯНГИКУРГОН%'))
        org = (await db.execute(org_q)).scalar_one_or_none()
        
        if not org:
            print("Organization not found!")
            return
            
        print(f"Organization: {org.name} (ID: {org.id})")
        print(f"Current Credit Balance (Balance Table/Column): {org.credit_balance:,.2f}")
        
        # 2. Total Invoices (Join with Reservation to get med_org_id)
        from app.models.sales import Reservation
        inv_q = select(func.sum(Invoice.total_amount), func.sum(Invoice.paid_amount))\
            .join(Reservation, Invoice.reservation_id == Reservation.id)\
            .where(Reservation.med_org_id == org.id)
        total_inv, total_paid = (await db.execute(inv_q)).one()
        print(f"Total Invoices Amount: {total_inv or 0:,.2f}")
        print(f"Total Invoices Paid (Cached in Invoice table): {total_paid or 0:,.2f}")
        
        # 3. Total Payments actually in DB
        pay_q = select(func.sum(Payment.amount)).where(Payment.med_org_id == org.id)
        actual_payments = (await db.execute(pay_q)).scalar() or 0
        print(f"Actual Payments Counted from Payment Table: {actual_payments:,.2f}")
        
        calculated_debt = (total_inv or 0) - actual_payments - (org.credit_balance or 0)
        print(f"\nCALCULATED DEBT (Invoices - Payments - Balance): {calculated_debt:,.2f}")

if __name__ == "__main__":
    asyncio.run(main())
