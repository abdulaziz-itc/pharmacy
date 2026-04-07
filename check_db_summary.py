
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, Reservation

async def check_db_summary():
    async with AsyncSessionLocal() as db:
        # Check remaining invoices
        stmt = select(func.count(Invoice.id))
        res = await db.execute(stmt)
        invoice_count = res.scalar()
        
        stmt = select(Invoice)
        res = await db.execute(stmt)
        invoices = res.scalars().all()
        
        print(f"Total Invoices: {invoice_count}")
        for inv in invoices:
            print(f"ID: {inv.id}, Num: {inv.factura_number}, Amount: {inv.total_amount}")
            
        # Check remaining payments
        stmt = select(func.sum(Payment.amount))
        res = await db.execute(stmt)
        total_payments = res.scalar() or 0
        
        print(f"Total Payments (Fact Postupleniya): {total_payments}")

if __name__ == "__main__":
    asyncio.run(check_db_summary())
