import asyncio
from app.api.v1.endpoints.sales import get_admin_bonus_summary
from app.db.session import async_session_maker
from app.models.user import User

async def test():
    async with async_session_maker() as db:
        # Mock current_user
        user = (await db.execute("SELECT * FROM users LIMIT 1")).fetchone()
        class MockUser:
            def __init__(self, row):
                self.id = row[0]
                self.role = row[4]
        
        # We don't really need a full mock if we just call the logic
        # But get_admin_bonus_summary is a fastapi endpoint, it's easier to just run the SQL logic here
        from sqlalchemy import select, func, and_, or_
        from app.models.sales import Invoice, Reservation, ReservationItem, InvoiceStatus
        
        g_real_q = select(func.coalesce(func.sum(ReservationItem.quantity * ReservationItem.price), 0.0)).select_from(Invoice)\
            .join(Reservation, Invoice.reservation_id == Reservation.id)\
            .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        
        global_realization = (await db.execute(g_real_q)).scalar() or 0
        print(f"Global Realization (Items Sum): {global_realization}")
        
        # Now check summing Invoice.total_amount directly
        inv_q = select(func.sum(Invoice.total_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
        inv_total = (await db.execute(inv_q)).scalar() or 0
        print(f"Global Realization (Invoice Total Amount): {inv_total}")

asyncio.run(test())
