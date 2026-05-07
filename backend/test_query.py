import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func, text, and_, or_
from app.models.sales import Payment
from app.models.crm import BalanceTransaction

async def check():
    async with AsyncSessionLocal() as db:
        app_payment_ids_sq = select(BalanceTransaction.payment_id).where(
            BalanceTransaction.payment_id.isnot(None),
            func.lower(BalanceTransaction.transaction_type) == 'application'
        ).scalar_subquery()

        pay_sum_q = select(func.coalesce(func.sum(Payment.amount), 0.0)).select_from(Payment)
        pay_sum_q = pay_sum_q.where(and_(Payment.date >= '2026-05-01', Payment.date < '2026-06-01'))
        pay_sum_q = pay_sum_q.where(Payment.id.notin_(app_payment_ids_sq))
        
        res1 = await db.execute(pay_sum_q)
        print("Without comment filter:", res1.scalar())

        pay_sum_q2 = pay_sum_q.where(or_(Payment.comment.is_(None), ~Payment.comment.ilike('%автоматическ%')))
        res2 = await db.execute(pay_sum_q2)
        print("With IS NULL | ILIKE filter:", res2.scalar())

asyncio.run(check())
