import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.product import Product
from app.models.sales import ReservationItem

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(ReservationItem).order_by(ReservationItem.id.desc()).limit(10))
        for item in res.scalars().all():
            print(f"Item: {item.id}, Qty: {item.quantity}, Price: {item.price}")
            print(f"Salary: {item.salary_amount}, Mktg: {item.marketing_amount}")

asyncio.run(main())
