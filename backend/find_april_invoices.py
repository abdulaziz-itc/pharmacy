
import asyncio
from sqlalchemy import select, and_, extract
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, Payment

async def find_remaining_invoices():
    async with AsyncSessionLocal() as db:
        # Find invoices in April 2026
        # realization_date or date
        stmt = select(Invoice).where(
            and_(
                extract('month', Invoice.realization_date) == 4,
                extract('year', Invoice.realization_date) == 2026
            )
        )
        result = await db.execute(stmt)
        invoices = result.scalars().all()
        
        print(f"FOUND {len(invoices)} INVOICES IN APRIL 2026:")
        for inv in invoices:
            print(f"ID: {inv.id}, NUM: {inv.factura_number}, AMOUNT: {inv.total_amount}")
            
        # Also check payments in same period
        stmt = select(Payment).where(
            and_(
                extract('month', Payment.date) == 4,
                extract('year', Payment.date) == 2026
            )
        )
        result = await db.execute(stmt)
        payments = result.scalars().all()
        print(f"\nFOUND {len(payments)} PAYMENTS IN APRIL 2026:")
        for p in payments:
            print(f"ID: {p.id}, INV_ID: {p.invoice_id}, AMOUNT: {p.amount}")

if __name__ == "__main__":
    asyncio.run(find_remaining_invoices())
