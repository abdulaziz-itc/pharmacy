"""
invoice_id = NULL bo'lgan 8 ta paymentni ko'rsatadi.
"""
import asyncio, os, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment
from app.models.crm import BalanceTransaction
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        payments = (await db.execute(
            select(Payment).where(Payment.invoice_id.is_(None))
            .order_by(Payment.id)
        )).scalars().all()

        print(f"invoice_id = NULL bo'lgan {len(payments)} ta payment:\n")
        for p in payments:
            bt = (await db.execute(
                select(BalanceTransaction).where(BalanceTransaction.payment_id == p.id)
            )).scalar_one_or_none()
            print(f"  #{p.id} | {p.amount:>15,.2f} UZS | type={p.payment_type} | date={p.date}")
            print(f"        comment='{p.comment}'")
            print(f"        BT: {'YOQ (orphan!)' if not bt else f'ID:{bt.id} type={bt.transaction_type}'}")
            print()

if __name__ == "__main__":
    asyncio.run(main())
