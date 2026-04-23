import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, func, and_, or_
from backend.app.db.session import SessionLocal
from backend.app.models.crm import BalanceTransaction
from backend.app.models.sales import Payment
from datetime import datetime

async def debug():
    async with SessionLocal() as db:
        start_date = datetime(2026, 4, 1)
        end_date = datetime(2026, 5, 1)
        
        # 1. Total Payments for April
        p_q = select(func.sum(Payment.amount)).where(and_(Payment.date >= start_date, Payment.date < end_date))
        p_row = await db.execute(p_q)
        p_sum = p_row.scalar() or 0
        
        # 2. Total Top-ups for April
        t_q = select(func.sum(BalanceTransaction.amount)).where(
            and_(
                BalanceTransaction.created_at >= start_date,
                BalanceTransaction.created_at < end_date,
                or_(
                    func.lower(BalanceTransaction.transaction_type) == "topup",
                    and_(func.lower(BalanceTransaction.transaction_type) == "adjustment", BalanceTransaction.amount > 0)
                )
            )
        )
        t_row = await db.execute(t_q)
        t_sum = t_row.scalar() or 0
        
        # 3. Last 5 topups
        last_q = select(BalanceTransaction.amount, BalanceTransaction.transaction_type, BalanceTransaction.created_at, BalanceTransaction.comment).order_by(BalanceTransaction.created_at.desc()).limit(5)
        last_res = (await db.execute(last_q)).all()
        
        print(f"--- DATABASE SNAPSHOT (APRIL 2026) ---")
        print(f"Payments Sum: {p_sum:,.2f}")
        print(f"Top-ups Sum: {t_sum:,.2f}")
        print(f"Combined Total: {p_sum + t_sum:,.2f}")
        print(f"---")
        print(f"Latest Transactions:")
        for r in last_res:
            print(f"  - {r.amount:,.0f} | {r.transaction_type} | {r.created_at} | {r.comment}")

if __name__ == '__main__':
    asyncio.run(debug())
