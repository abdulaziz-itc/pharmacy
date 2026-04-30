"""
Payment jadvali va Excel o'rtasidagi farqni tushuntiradi.
"""
import asyncio, os, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment, Invoice
from app.models.crm import BalanceTransaction
from sqlalchemy import select, func, text

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Jami payment soni va summasi
        count, total = (await db.execute(
            select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0))
        )).one()
        print(f"Payment jadvalidagi jami: {count} ta | {total:,.2f} UZS")

        # 2. invoice_id bor va yo'q paymentlar
        with_inv = (await db.execute(
            select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0))
            .where(Payment.invoice_id.isnot(None))
        )).one()
        print(f"  invoice_id bor:          {with_inv[0]} ta | {with_inv[1]:,.2f} UZS")

        without_inv = (await db.execute(
            select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0))
            .where(Payment.invoice_id.is_(None))
        )).one()
        print(f"  invoice_id yo'q:         {without_inv[0]} ta | {without_inv[1]:,.2f} UZS")

        # 3. Payment type breakdown
        print("\n--- Payment type bo'yicha ---")
        rows = (await db.execute(
            select(Payment.payment_type, func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0))
            .group_by(Payment.payment_type)
            .order_by(func.sum(Payment.amount).desc())
        )).all()
        for row in rows:
            print(f"  {str(row[0]):15} | {row[1]:4} ta | {row[2]:>20,.2f} UZS")

        # 4. Topup BT
        bt_count, bt_total = (await db.execute(
            select(func.count(BalanceTransaction.id), func.coalesce(func.sum(BalanceTransaction.amount), 0.0))
            .where(func.lower(BalanceTransaction.transaction_type) == 'topup')
        )).one()
        print(f"\nTopup BalanceTransaction: {bt_count} ta | {bt_total:,.2f} UZS")

        print(f"\nDashboard = {total:,.2f} + {bt_total:,.2f} = {total+bt_total:,.2f}")
        print(f"Excel ko'rsatgan:                                    2,917,553,738.00")
        print(f"Farq (Dashboard - Excel):             {(total+bt_total) - 2917553738:>20,.2f}")

if __name__ == "__main__":
    asyncio.run(main())
