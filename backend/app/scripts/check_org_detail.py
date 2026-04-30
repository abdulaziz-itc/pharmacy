"""
ЯНГИКУРГОН ДОРИ ДАРМОН (ID: 202) uchun batafsil tekshiruv.
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, Reservation
from app.models.crm import MedicalOrganization, BalanceTransaction
from sqlalchemy import select, func

ORG_ID = 202

async def main():
    async with AsyncSessionLocal() as db:
        org = (await db.execute(select(MedicalOrganization).where(MedicalOrganization.id == ORG_ID))).scalar_one()
        print(f"Tashkilot: {org.name}")
        print(f"credit_balance (ortiqcha to'lov): {org.credit_balance:,.2f}\n")

        # Invoices
        inv_rows = (await db.execute(
            select(Invoice.id, Invoice.total_amount, Invoice.paid_amount, Invoice.status)
            .join(Reservation, Invoice.reservation_id == Reservation.id)
            .where(Reservation.med_org_id == ORG_ID)
        )).all()

        print(f"--- FAKTURALAR ({len(inv_rows)} ta) ---")
        total_inv = 0
        total_cached_paid = 0
        total_real_paid = 0
        for row in inv_rows:
            real = (await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == row.id)
            )).scalar() or 0.0
            diff = real - row.paid_amount
            if abs(diff) > 0.01:
                print(f"  Invoice #{row.id} [{row.status}]: total={row.total_amount:,.2f} | cached={row.paid_amount:,.2f} | real={real:,.2f} | FARQ={diff:+,.2f}")
            total_inv += row.total_amount
            total_cached_paid += row.paid_amount
            total_real_paid += real

        print(f"\nJAMI:")
        print(f"  Faktura summasi:         {total_inv:,.2f}")
        print(f"  Kesh (paid_amount):      {total_cached_paid:,.2f}")
        print(f"  Haqiqiy (Payment jadv):  {total_real_paid:,.2f}")
        print(f"  Kesh bo'yicha qarz:      {total_inv - total_cached_paid:,.2f}")
        print(f"  Haqiqiy qarz:            {total_inv - total_real_paid:,.2f}")

        # Balance Transactions
        bt_rows = (await db.execute(
            select(BalanceTransaction).where(BalanceTransaction.organization_id == ORG_ID)
            .order_by(BalanceTransaction.created_at.desc()).limit(10)
        )).scalars().all()
        print(f"\n--- SO'NGGI 10 ta BALANCE TRANZAKSIYA ---")
        for bt in bt_rows:
            print(f"  ID:{bt.id} | {bt.transaction_type} | {bt.amount:,.2f} | {bt.created_at}")

if __name__ == "__main__":
    asyncio.run(main())
