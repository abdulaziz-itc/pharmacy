"""
Payment #386 (15,762,409.42) ni o'chiradi — BT#481 dan kelgan va hozir yetim.
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
                print(f"Payment #{pmt.id} | {pmt.amount:,.2f} | invoice_id={pmt.invoice_id} | '{pmt.comment}'")
                payments.append(pmt)
            else:
                print(f"Payment #{pid} - TOPILMADI (allaqachon o'chirilgan)")

        if not payments:
            print("\n✅ O'chiriladigan narsa yo'q.")
            return

        total = sum(p.amount for p in payments)
        print(f"\nJami o'chiriladigan: {total:,.2f} UZS")
        print("Davom etish uchun 'yes' yozing:")
        answer = input().strip().lower()
        if answer != 'yes':
            print("Bekor qilindi.")
            return

        affected_inv_ids = {p.invoice_id for p in payments}
        for pmt in payments:
            await db.delete(pmt)
        await db.flush()

        for inv_id in affected_inv_ids:
            real_paid = (await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv_id)
            )).scalar() or 0.0
            inv_obj = (await db.execute(select(Invoice).where(Invoice.id == inv_id))).scalar_one_or_none()
            if inv_obj:
                old = inv_obj.paid_amount
                inv_obj.paid_amount = real_paid
                if real_paid <= 0:
                    inv_obj.status = InvoiceStatus.UNPAID
                elif real_paid < inv_obj.total_amount:
                    inv_obj.status = InvoiceStatus.PARTIAL
                else:
                    inv_obj.status = InvoiceStatus.PAID
                print(f"  Invoice #{inv_id}: {old:,.2f} → {real_paid:,.2f} ({inv_obj.status.value})")

        await db.commit()
        print(f"\n✅ Tuzatildi! Debitorka ~{total:,.0f} ga ko'tarilishi kerak.")

if __name__ == "__main__":
    asyncio.run(main())
