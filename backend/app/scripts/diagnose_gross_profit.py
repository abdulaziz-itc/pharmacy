"""
Analyze gross profit breakdown for May.
"""
import asyncio, os, sys
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, ReservationItem
from app.models.product import Product
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as db:
        # We don't have the server's db, but we can write the script to be run on the server
        # Let's print out the exact products that are part of May invoices
        query = select(Invoice).options(
            selectinload(Invoice.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product)
        ).where(Invoice.date >= date(2026, 5, 1))

        res = (await db.execute(query)).scalars().all()
        print(f"Total May invoices on server: {len(res)}")
        
        for inv in res:
            print(f"Invoice #{inv.id} | Total Amount: {inv.total_amount} | Paid Amount: {inv.paid_amount}")
            if not inv.reservation:
                continue
            for item in inv.reservation.items:
                p = item.product
                print(f"  Item ID: {item.id} | Product: {p.name if p else 'N/A'}")
                if p:
                    print(f"    Product Costs:")
                    print(f"      Production Price: {p.production_price}")
                    print(f"      Salary Expense: {p.salary_expense}")
                    print(f"      Marketing Expense: {p.marketing_expense}")
                    print(f"      Other Expenses: {p.other_expenses}")
                print(f"    Item Values:")
                print(f"      Quantity: {item.quantity}")
                print(f"      Price: {item.price}")
                print(f"      Discount Percent: {item.discount_percent}")
                print(f"      Item Salary Amount: {item.salary_amount}")
                print(f"      Item Marketing Amount: {item.marketing_amount}")

                exact_price = item.price * (1 - (item.discount_percent or 0) / 100.0)
                unit_profit = (
                    exact_price - 
                    (p.production_price or 0 if p else 0) - 
                    (item.salary_amount if item.salary_amount is not None and item.salary_amount > 0 else (p.salary_expense or 0 if p else 0)) -
                    (item.marketing_amount if item.marketing_amount is not None and item.marketing_amount > 0 else (p.marketing_expense or 0 if p else 0)) -
                    (p.other_expenses or 0 if p else 0)
                )
                print(f"    Calculated Unit Profit: {unit_profit}")
                print(f"    Calculated Total Profit: {unit_profit * item.quantity}")
                
if __name__ == "__main__":
    asyncio.run(main())
