"""
Faqat BT#481 (15,762,409.42 topup, April 17) dan kelgan Payment #386 ni o'chiradi.
Invoice #361 paid_amount qayta hisoblanadi.
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, InvoiceStatus
from sqlalchemy import select, func

TARGET_PAYMENT_IDS = [386]

async def main():
    async with AsyncSessionLocal() as db:
        payments = []
        for pid in TARGET_PAYMENT_IDS:
            pmt = (await db.execute(select(Payment).where(Payment.id == pid))).scalar_one_or_none()
            if pmt:
                print(f"Payment #{pmt.id} | {pmt.amount:,.2f} UZS | invoice_id={pmt.invoice_id} | '{pmt.comment}'")
                payments.append(pmt)
            else:
                print(f"Payment #{pid} - topilmadi (allaqachon o'chirilgan)")

        if not payments:
            print("\n✅ O'chiriladigan narsa yo'q.")
            return

        total = sum(p.amount for p in payments)
        print(f"\nJami: {total:,.2f} UZS")
        print("'yes' deb tasdiqlang:")
        answer = input().strip().lower()
        if answer != 'yes':
            print("Bekor qilindi.")
            return

        affected = {p.invoice_id for p in payments}
        for p in payments:
            await db.delete(p)
        await db.flush()

        for inv_id in affected:
            real = (await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv_id)
            )).scalar() or 0.0
            inv = (await db.execute(select(Invoice).where(Invoice.id == inv_id))).scalar_one_or_none()
            if inv:
                inv.paid_amount = real
                inv.status = InvoiceStatus.UNPAID if real <= 0 else InvoiceStatus.PARTIAL if real < inv.total_amount else InvoiceStatus.PAID
                print(f"  Invoice #{inv_id}: {inv.paid_amount:,.2f} → {real:,.2f} ({inv.status.value})")

        await db.commit()
        print(f"\n✅ Tuzatildi. Debitorka ~{total:,.0f} ga ko'tarildi.")

if __name__ == "__main__":
    asyncio.run(main())
