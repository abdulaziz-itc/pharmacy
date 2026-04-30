import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.finance import OtherExpense
from app.models.sales import Invoice, ReservationItem, Reservation
from app.models.product import Product
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        # Check Total Expenses
        exp_sum = (await db.execute(select(func.sum(OtherExpense.amount)))).scalar() or 0.0
        print(f"Total Expenses (All Time): {exp_sum:,.2f} UZS")
        
        # Top 5 Expenses
        top_exps = (await db.execute(select(OtherExpense).order_by(OtherExpense.amount.desc()).limit(5))).scalars().all()
        print("\nTop 5 Expenses:")
        for e in top_exps:
            print(f"- {e.amount:,.2f} UZS | {e.comment} | {e.date}")

        # Check Gross Profit components
        # Calculate sum of (price - prod_price - salary - marketing - other) * quantity
        profit_q = select(
            ReservationItem.id,
            ReservationItem.price,
            Product.production_price,
            Product.salary_expense,
            Product.marketing_expense,
            Product.other_expenses,
            ReservationItem.quantity,
            Invoice.paid_amount,
            Invoice.total_amount
        ).join(Product, ReservationItem.product_id == Product.id)\
         .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
         .join(Invoice, Invoice.reservation_id == Reservation.id)\
         .limit(10)
         
        res = await db.execute(profit_q)
        print("\nSample 10 Profit Items (Unit Calculation):")
        for r in res:
            unit_profit = (r.price or 0) - (r.production_price or 0) - (r.salary_expense or 0) - (r.marketing_expense or 0) - (r.other_expenses or 0)
            total_profit = unit_profit * r.quantity * (r.paid_amount / r.total_amount if r.total_amount > 0 else 0)
            print(f"- ID: {r.id} | Unit Profit: {unit_profit:,.2f} | Total: {total_profit:,.2f} | Price: {r.price} | Prod: {r.production_price}")

if __name__ == "__main__":
    asyncio.run(main())
