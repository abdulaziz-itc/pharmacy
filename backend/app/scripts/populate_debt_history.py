import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.sales import Invoice
from app.models.crm import BalanceTransaction, BalanceTransactionType, MedicalOrganization
from sqlalchemy import select
from datetime import datetime

async def populate_debt_history():
    print("🚀 Starting retroactive debt history population...")
    async with SessionLocal() as db:
        # 1. Fetch all invoices that DON'T have a corresponding BalanceTransactionType.INVOICE
        # We check this by seeing if an entry with related_invoice_id and type 'invoice' exists
        result = await db.execute(
            select(Invoice)
            .join(MedicalOrganization, Invoice.reservation_id == Invoice.reservation_id) # Just to ensure relationships
            .where(~Invoice.id.in_(
                select(BalanceTransaction.related_invoice_id)
                .where(BalanceTransaction.transaction_type == BalanceTransactionType.INVOICE)
                .where(BalanceTransaction.related_invoice_id.isnot(None))
            ))
        )
        invoices_to_fix = result.scalars().all()
        print(f"📦 Found {len(invoices_to_fix)} invoices missing debt history.")

        for inv in invoices_to_fix:
            # Need to find the organization_id from the reservation
            # reservation_id is same on Invoice and Reservation
            from app.models.sales import Reservation
            res_result = await db.execute(select(Reservation).where(Reservation.id == inv.reservation_id))
            res = res_result.scalars().first()
            if not res or not res.med_org_id:
                continue

            bt = BalanceTransaction(
                organization_id=res.med_org_id,
                amount=-inv.total_amount,
                transaction_type=BalanceTransactionType.INVOICE,
                related_invoice_id=inv.id,
                comment=f"Начисление долga (архив) по счетu #{inv.factura_number or inv.id}",
                created_at=inv.created_at or datetime.utcnow()
            )
            db.add(bt)
            print(f"✅ Added debt entry for Invoice #{inv.factura_number or inv.id} (Org ID: {res.med_org_id})")

        await db.commit()
        print("🎉 Done! All missing debt entries have been populated.")

if __name__ == "__main__":
    asyncio.run(populate_debt_history())
