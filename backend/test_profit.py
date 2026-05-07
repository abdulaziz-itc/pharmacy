import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func, and_
from app.models.product import Product
from app.models.sales import Invoice, Reservation, ReservationItem
from app.models.finance import OtherExpense
from datetime import datetime

async def check():
    async with AsyncSessionLocal() as db:
        start_date = datetime(2026, 5, 1)
        
        # Check expenses
        exp = await db.execute(select(func.sum(OtherExpense.amount)).where(OtherExpense.date >= start_date))
        print("Expenses (May 2026):", exp.scalar())

        # Check Gross Profit
        gross_profit_sum_q = select(
            func.coalesce(func.sum(
                (ReservationItem.price * (1 - func.coalesce(ReservationItem.discount_percent, 0) / 100.0) - 
                 func.coalesce(Product.production_price, 0) -
                 func.coalesce(Product.salary_expense, 0) - 
                 func.coalesce(Product.marketing_expense, 0) -
                 func.coalesce(Product.other_expenses, 0)) * 
                ReservationItem.quantity * (func.coalesce(Invoice.paid_amount, 0) / Invoice.total_amount)
            ), 0.0)
        ).select_from(ReservationItem)\
         .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
         .join(Invoice, Invoice.reservation_id == Reservation.id)\
         .join(Product, ReservationItem.product_id == Product.id)\
         .where(and_(Invoice.total_amount > 0, Invoice.status != 'CANCELLED'))\
         .where(Invoice.date >= start_date)
        
        gp = await db.execute(gross_profit_sum_q)
        print("Gross Profit (May 2026):", gp.scalar())

asyncio.run(check())
