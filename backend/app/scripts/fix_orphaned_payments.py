"""
Faqat BalanceTransaction ID:481 (15,762,409.42 topup) va ID:612 (~15M topup)
dan kelgan Payment larni topib o'chiradi.

Maqsad: Payment #386 (15,762,409.42) va Payment #436 (637,638.58) ni o'chirish,
chunki ular o'chirilgan BalanceTransaction lardan kelgan.
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

# Faqat shu Payment ID larni o'chiramiz (orphaned topup applicationlar):
# #386 = 15,762,409.42 (BT:481 topup dan kelgan application)
# #436 = 637,638.58 (BT:611 dan kelgan application — lekin BT:611 hali bazada bor!)
# Ehtiyotkorlik bilan tekshiramiz.

async def main():
    async with AsyncSessionLocal() as db:
        # Org 202 ga tegishli fakturalar
        inv_ids_q = select(Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.med_org_id == ORG_ID)
        inv_ids = [row[0] for row in (await db.execute(inv_ids_q)).all()]

        # Barcha paymentlarni topamiz
        pay_q = select(Payment).where(Payment.invoice_id.in_(inv_ids))
        payments = (await db.execute(pay_q)).scalars().all()

        print("--- HAQIQIY YETIM TO'LOVLAR TAHLILI ---")
        print("(Faqat comment 'Автоматическое погашение' yoki BT bazada YOQ ammo source_payment_id ham YOQ)\n")

        orphaned = []
        for pmt in payments:
            # 1. BT bormi?
            bt_q = select(BalanceTransaction).where(BalanceTransaction.payment_id == pmt.id)
            bt = (await db.execute(bt_q)).scalar_one_or_none()

            # 2. Agar BT yo'q VA comment "Автоматическое" bo'lsa — bu yetim application
            is_auto = pmt.comment and ('автоматическ' in pmt.comment.lower() or 'погашени' in pmt.comment.lower())
            
            if not bt and is_auto:
                print(f"  ✅ YETIM: Payment #{pmt.id} | {pmt.amount:,.2f} | comment='{pmt.comment}'")
                orphaned.append(pmt)
            elif not bt:
                print(f"  ⚠️  BT yo'q lekin auto emas: Payment #{pmt.id} | {pmt.amount:,.2f} | type={pmt.payment_type} | comment='{pmt.comment}'")
            else:
                pass  # Normal to'lov

        if not orphaned:
            print("\n--- COMMENT BO'YICHA TOPILMADI. MANUAL TEKSHIRUV ---")
            print("Quyidagi Payment ID larni ko'rsating (BT 481 dan kelgan):")
            print("  Payment #386 | 15,762,409.42 - Bu o'chirilishi kerak")
            print("  Payment #436 | 637,638.58 - BT:611 hali bazada, o'chirmaslik kerak")
            
            # Faqat #386 ni o'chiramiz
            target_ids = [386]
            print(f"\nFaqat Payment ID {target_ids} o'chiriladi. Davom etish uchun 'yes' yozing:")
            answer = input().strip().lower()
            if answer != 'yes':
                print("Bekor qilindi.")
                return
            
            for pay_id in target_ids:
                pmt = (await db.execute(select(Payment).where(Payment.id == pay_id))).scalar_one_or_none()
                if pmt:
                    orphaned.append(pmt)

        if not orphaned:
            print("O'chiriladigan narsa topilmadi.")
            return

        affected_inv_ids = {p.invoice_id for p in orphaned}
        total = sum(p.amount for p in orphaned)
        print(f"\nO'chiriladigan: {len(orphaned)} ta to'lov, jami {total:,.2f} UZS")
        print("Davom etish uchun 'yes' yozing:")
        answer = input().strip().lower()
        if answer != 'yes':
            print("Bekor qilindi.")
            return

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
                print(f"  Invoice #{inv_id}: {old:,.2f} → {real_paid:,.2f}")

        await db.commit()
        print(f"\n✅ Tuzatildi! Debitorka yangilandi.")

if __name__ == "__main__":
    asyncio.run(main())
