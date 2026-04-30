"""
BalanceTransaction o'chirilgan lekin Payment lari qolgan
"yetim" (orphaned) to'lovlarni topib o'chiradi va Invoice.paid_amount ni tuzatadi.
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, Reservation, InvoiceStatus
from app.models.crm import BalanceTransaction, MedicalOrganization
from sqlalchemy import select, func, text

ORG_ID = 202  # Yangiкurgon Dori Darmon

async def main():
    async with AsyncSessionLocal() as db:
        # Org 202 ga tegishli barcha Invoice ID larini topamiz
        inv_ids_q = select(Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.med_org_id == ORG_ID)
        inv_ids = [row[0] for row in (await db.execute(inv_ids_q)).all()]
        print(f"Ushbu org uchun {len(inv_ids)} ta faktura topildi: {inv_ids}")

        # Bu fakturalardagi barcha Payment larni topamiz
        pay_q = select(Payment).where(Payment.invoice_id.in_(inv_ids))
        payments = (await db.execute(pay_q)).scalars().all()
        print(f"\nJami {len(payments)} ta to'lov topildi:")
        
        orphaned = []
        for pmt in payments:
            # Bu payment ga tegishli BalanceTransaction bormi?
            bt_q = select(BalanceTransaction).where(BalanceTransaction.payment_id == pmt.id)
            bt = (await db.execute(bt_q)).scalar_one_or_none()
            
            print(f"  Payment #{pmt.id} | {pmt.amount:,.2f} | invoice_id={pmt.invoice_id} | BT={'YOQ (orphan!)' if not bt else f'ID:{bt.id} ({bt.transaction_type})'}")
            if not bt:
                orphaned.append(pmt)
        
        if not orphaned:
            print("\n✅ Yetim to'lovlar topilmadi. Muammo boshqa joyda.")
            return
        
        print(f"\n⚠️  {len(orphaned)} ta YETIM (orphaned) to'lov topildi!")
        total_orphan = sum(p.amount for p in orphaned)
        print(f"Jami yetim summa: {total_orphan:,.2f} UZS")
        print("\nUlarni o'chirish uchun 'yes' yozing:")
        answer = input().strip().lower()
        
        if answer != 'yes':
            print("Bekor qilindi.")
            return
        
        # O'chirish va qayta hisoblash
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
                print(f"  Invoice #{inv_id}: {old:,.2f} → {real_paid:,.2f}")
        
        await db.commit()
        print(f"\n✅ {len(orphaned)} ta yetim to'lov o'chirildi. Debitorka yangilandi.")

if __name__ == "__main__":
    asyncio.run(main())
