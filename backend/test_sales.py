import asyncio
from app.db.session import SessionLocal
from sqlalchemy import select, func, text

async def run():
    async with SessionLocal() as db:
        print("Checking Realizations for Medreps...")
        res = await db.execute(text("""
            SELECT r.created_by_id, SUM(ri.quantity * ri.price) 
            FROM invoices i
            JOIN reservations r ON i.reservation_id = r.id
            JOIN reservation_items ri ON r.id = ri.reservation_id
            WHERE i.status != 'CANCELLED'
            GROUP BY r.created_by_id
        """))
        print(res.fetchall())
        
        print("Checking Accruals...")
        res2 = await db.execute(text("SELECT user_id, SUM(amount) FROM bonus_ledger WHERE type='ACCRUAL' GROUP BY user_id"))
        print(res2.fetchall())

asyncio.run(run())
