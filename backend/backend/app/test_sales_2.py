import asyncio
from app.db.session import async_session_maker
from sqlalchemy import select, func
from app.models.sales import Invoice, Payment, Reservation, ReservationItem, InvoiceStatus
from app.models.user import User

async def run():
    async with async_session_maker() as db:
        print("Checking users...")
        medreps_result = await db.execute(select(User).where(User.role == 'MED_REP', User.is_active == True))
        rep_ids = [r.id for r in medreps_result.scalars().all()]
        print("MED_REP IDs:", rep_ids)
        
        real_q = select(
            Reservation.created_by_id, 
            func.sum(ReservationItem.quantity * ReservationItem.price).label("amount")
        ).select_from(Invoice)\
         .join(Reservation, Invoice.reservation_id == Reservation.id)\
         .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
         .where(Invoice.status != InvoiceStatus.CANCELLED, Reservation.created_by_id.in_(rep_ids))
        
        real_res = await db.execute(real_q.group_by(Reservation.created_by_id))
        print("REALIZATION MAP:")
        for row in real_res:
            print(f"User {row.created_by_id}: {row.amount}")

asyncio.run(run())
