from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.sales import Payment
from app.models.crm import BalanceTransaction, BalanceTransactionType
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # GLOBAL TOTALS (matching dashboard card)
        gp_q = select(func.sum(Payment.amount))
        global_p = (await db.execute(gp_q)).scalar() or 0.0
        
        gt_q = select(func.sum(BalanceTransaction.amount)).where(
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        )
        global_t = (await db.execute(gt_q)).scalar() or 0.0
        
        print(f"Total Payments (Standard): {global_p:,.2f}")
        print(f"Total Topups (Refills):  {global_t:,.2f}")
        print(f"GRAND FACT TOTAL:        {(global_p + global_t):,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
