import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice
from app.models.finance import OtherExpense
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        print("\n--- SOTUVLAR OYLAR BO'YICHA ---")
        inv_r = await db.execute(select(func.extract('month', Invoice.date), func.sum(Invoice.total_amount)).group_by(func.extract('month', Invoice.date)))
        for row in inv_r.all():
            print(f"Oy: {int(row[0])} | Summa: {row[1]:,.2f} UZS")

        print("\n--- XARAJATLAR OYLAR BO'YICHA ---")
        exp_r = await db.execute(select(func.extract('month', OtherExpense.date), func.sum(OtherExpense.amount)).group_by(func.extract('month', OtherExpense.date)))
        for row in exp_r.all():
            print(f"Oy: {int(row[0])} | Summa: {row[1]:,.2f} UZS")

if __name__ == "__main__":
    asyncio.run(main())
