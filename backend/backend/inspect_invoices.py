import asyncio
from sqlalchemy import select, func
from app.db.session import async_session_maker
from app.models.sales import Invoice, ReservationItem

async def run():
    async with async_session_maker() as db:
        res = await db.execute(select(Invoice.id, Invoice.factura_number, Invoice.total_amount))
        for row in res:
            inv_id, num, total = row
            # Get items
            q_items = select(func.sum(ReservationItem.quantity * ReservationItem.price)).where(ReservationItem.reservation_id == (
                select(Invoice.reservation_id).where(Invoice.id == inv_id).scalar_subquery()
            ))
            items_sum = (await db.execute(q_items)).scalar() or 0
            print(f"Invoice {num} (ID {inv_id}): Total Amount {total}, Items Sum {items_sum}")

asyncio.run(run())
