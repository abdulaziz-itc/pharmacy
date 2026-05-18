import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, or_
from app.models.sales import Invoice, Reservation, ReservationItem
from app.models.product import Product

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Invoice)
            .where(or_(
                Invoice.factura_number == '492',
                Invoice.id == 492,
                Invoice.reservation_id == 492
            ))
        )
        invs = res.scalars().all()
        for inv in invs:
            print(f"Found Invoice ID: {inv.id}, Factura: {inv.factura_number}")
            
        # Or maybe it's just the ReservationItem ID? Let's check ReservationItems.
        # But wait, we already tried ReservationItem ID = 492 and it wasn't found.
        # Let's search for the product instead, maybe there's only one with qty 30 on May 6
        res2 = await db.execute(
             select(ReservationItem, Invoice)
             .join(Reservation, ReservationItem.reservation_id == Reservation.id)
             .join(Invoice, Invoice.reservation_id == Reservation.id)
             .where(ReservationItem.quantity == 30)
        )
        
        for item, inv in res2.all():
             print(f"Item ID: {item.id}, Inv ID: {inv.id}, Factura: {inv.factura_number}, Date: {inv.date}, Product: {item.product_id}")

asyncio.run(main())
