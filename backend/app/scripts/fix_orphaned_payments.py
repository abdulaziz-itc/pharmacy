"""
Org 202 uchun barcha orphaned "Автоматическое погашение" paymentlarini ko'rsatadi
va tasdiqlashdan so'ng o'chiradi. Invoice paid_amount qayta hisoblanadi.
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, Reservation, InvoiceStatus
from app.models.crm import BalanceTransaction
from sqlalchemy import select, func

ORG_ID = 202

async def main():
    async with AsyncSessionLocal() as db:
        inv_ids = [r[0] for r in (await db.execute(
            select(Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id)
            .where(Reservation.med_org_id == ORG_ID)
        )).all()]

        payments = (await db.execute(
            select(Payment).where(Payment.invoice_id.in_(inv_ids))
        )).scalars().all()

        orphaned = []
        for pmt in payments:
            bt = (await db.execute(
                select(BalanceTransaction).where(BalanceTransaction.payment_id == pmt.id)
            )).scalar_one_or_none()
            is_auto = pmt.comment and ('автоматическ' in pmt.comment.lower() or 'погашени' in pmt.comment.lower() or 'баланса' in pmt.comment.lower())
            if not bt and is_auto:
                orphaned.append(pmt)

        if not orphaned:
            print("✅ Yetim to'lovlar topilmadi.")
            return

        print(f"⚠️  {len(orphaned)} ta YETIM to'lov topildi:\n")
        for p in orphaned:
            print(f"  Payment #{p.id} | {p.amount:,.2f} UZS | invoice_id={p.invoice_id} | '{p.comment[:60]}'")

        total = sum(p.amount for p in orphaned)
        print(f"\nJami: {total:,.2f} UZS")
        print("\nBarchasini o'chirish uchun 'yes' yozing:")
        answer = input().strip().lower()
        if answer != 'yes':
            print("Bekor qilindi.")
            return

        affected_inv_ids = {p.invoice_id for p in orphaned}
        for pmt in orphaned:
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
        print(f"\n✅ {len(orphaned)} ta yetim to'lov o'chirildi. Debitorka yangilandi.")

if __name__ == "__main__":
    asyncio.run(main())
