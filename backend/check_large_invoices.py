import asyncio
from sqlalchemy import select, desc
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice

async def check_largest_invoices():
    async with AsyncSessionLocal() as db:
        query = select(Invoice).order_by(desc(Invoice.total_amount)).limit(10)
        res = await db.execute(query)
        invoices = res.scalars().all()
        print("TOP 10 LARGEST INVOICES:")
        for inv in invoices:
            print(f"ID: {inv.id}, Number: {inv.factura_number}, Amount: {inv.total_amount:,.2f}, Paid: {inv.paid_amount:,.2f}")

if __name__ == "__main__":
    asyncio.run(check_largest_invoices())
