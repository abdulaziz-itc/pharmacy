import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.sales import ReservationItem

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(ReservationItem).where(ReservationItem.id == 492))
        item = res.scalars().first()
        if item:
            print(f"Item: {item.id}, Qty: {item.quantity}, Price: {item.price}")
            print(f"Salary: {item.salary_amount}, Mktg: {item.marketing_amount}")
        else:
            print("Item 492 not found")

        # Let's also check invoice id 492
        from app.models.sales import Invoice
        res2 = await db.execute(select(Invoice).where(Invoice.id == 492))
        inv = res2.scalars().first()
        if inv:
            print(f"Invoice 492: ResID: {inv.reservation_id}, Total: {inv.total_amount}")
            res_items = await db.execute(select(ReservationItem).where(ReservationItem.reservation_id == inv.reservation_id))
            for i in res_items.scalars().all():
                 print(f"  Item: ID={i.id}, ProductID={i.product_id}, Qty={i.quantity}, Price={i.price}, Sal={i.salary_amount}, Mkt={i.marketing_amount}")

asyncio.run(main())
