import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.sales import Invoice

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Invoice).where(Invoice.factura_number == '492'))
        inv = res.scalars().first()
        if inv:
            print(f"Found Invoice ID: {inv.id}, Factura: {inv.factura_number}")
            print(f"Total: {inv.total_amount}, Paid: {inv.paid_amount}")
        else:
            print("Factura 492 not found")

asyncio.run(main())
