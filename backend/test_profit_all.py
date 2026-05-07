import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func, and_
from app.models.finance import OtherExpense
from app.models.crm import BonusLedger

async def check():
    async with AsyncSessionLocal() as db:
        # Check all expenses grouped by month
        exp_q = select(func.date_trunc('month', OtherExpense.date).label('m'), func.sum(OtherExpense.amount)).group_by('m')
        exp = await db.execute(exp_q)
        print("Expenses by month:")
        for row in exp:
            print(row[0], row[1])
            
        # Also check BonusLedger total payout
        payout = await db.execute(select(func.sum(BonusLedger.amount)).where(BonusLedger.is_paid == True))
        print("Total actual_payout_sum:", payout.scalar())

asyncio.run(check())
