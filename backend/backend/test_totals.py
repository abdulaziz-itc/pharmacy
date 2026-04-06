import asyncio
from app.db.session import async_session_maker
from sqlalchemy import select, func
from app.models.sales import Invoice, InvoiceStatus

async def test():
    async with async_session_maker() as db:
        q = select(func.sum(Invoice.total_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
        res = (await db.execute(q)).scalar() or 0
        print(f"TOTAL REALIZATION: {res}")
        
        q_paid = select(func.sum(Invoice.paid_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
        res_paid = (await db.execute(q_paid)).scalar() or 0
        print(f"TOTAL PAID: {res_paid}")

asyncio.run(test())
