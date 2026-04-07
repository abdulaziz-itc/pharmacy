
import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.sales import Reservation, Invoice

async def check_pending():
    async with AsyncSessionLocal() as db:
        res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.is_deletion_pending == True))
        inv_count = await db.execute(select(func.count(Invoice.id)).where(Invoice.is_deletion_pending == True))
        ret_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.is_return_pending == True))
        
        print(f"Pending Reservations: {res_count.scalar()}")
        print(f"Pending Invoices: {inv_count.scalar()}")
        print(f"Pending Returns: {ret_count.scalar()}")
        
        res_ids = await db.execute(select(Reservation.id).where(Reservation.is_deletion_pending == True))
        inv_ids = await db.execute(select(Invoice.id).where(Invoice.is_deletion_pending == True))
        
        print(f"Res IDs: {[r[0] for r in res_ids.all()]}")
        print(f"Inv IDs: {[r[0] for r in inv_ids.all()]}")

if __name__ == "__main__":
    asyncio.run(check_pending())
