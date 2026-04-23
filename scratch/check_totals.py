from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.sales import Payment
from app.models.crm import BalanceTransaction, BalanceTransactionType
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # Sum of all payments
        p_q = select(func.sum(Payment.amount))
        p_res = await db.execute(p_q)
        total_p = p_res.scalar() or 0.0
        
        # Sum of all TOPUPs
        t_q = select(func.sum(BalanceTransaction.amount)).where(
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        )
        t_res = await db.execute(t_q)
        total_t = t_res.scalar() or 0.0
        
        print(f"Total Payments: {total_p:,.2f}")
        print(f"Total TOPUPs:  {total_t:,.2f}")
        print(f"Grand Total:   {(total_p + total_t):,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
