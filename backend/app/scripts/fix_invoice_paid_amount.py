"""
Bu skript barcha Invoice (faktura)larning paid_amount maydonini
Payment jadvalidagi haqiqiy to'lovlar asosida qayta hisoblaydi.

Ishlatish:
  ~/virtualenv/repositories/pharmacy/backend/3.13/bin/python app/scripts/fix_invoice_paid_amount.py
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, InvoiceStatus
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

async def recalculate_all_invoices(db: AsyncSession, dry_run: bool = False):
    # Get all invoices
    invoices_q = select(Invoice).where(Invoice.status != InvoiceStatus.CANCELLED)
    invoices = (await db.execute(invoices_q)).scalars().all()
    
    fixed = 0
    total = len(invoices)
    
    for inv in invoices:
        # Sum actual payments for this invoice
        real_paid_q = select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv.id)
        real_paid = (await db.execute(real_paid_q)).scalar() or 0.0
        
        if abs(real_paid - (inv.paid_amount or 0.0)) > 0.01:
            print(f"Invoice #{inv.id}: cached={inv.paid_amount:,.2f} | real={real_paid:,.2f} | diff={real_paid - inv.paid_amount:,.2f}")
            
            if not dry_run:
                inv.paid_amount = real_paid
                # Update status
                if real_paid <= 0:
                    inv.status = InvoiceStatus.UNPAID
                elif real_paid >= inv.total_amount:
                    inv.status = InvoiceStatus.PAID
                else:
                    inv.status = InvoiceStatus.PARTIAL
            fixed += 1
    
    if not dry_run and fixed > 0:
        await db.commit()
        print(f"\n✅ {fixed}/{total} ta faktura muvaffaqiyatli tuzatildi.")
    elif dry_run:
        print(f"\n[DRY RUN] {fixed}/{total} ta faktura tuzatilishi kerak.")
    else:
        print(f"\n✅ Barcha {total} ta faktura to'g'ri edi, hech narsa o'zgarmadi.")

async def main():
    print("--- FAKTURALAR paid_amount TEKSHIRUVI ---\n")
    async with AsyncSessionLocal() as db:
        # First show what would change
        print(">>> Avval tekshiruvchi rejimda ishlaymiz (hech narsa o'zgarmaydi):\n")
        await recalculate_all_invoices(db, dry_run=True)
        
        print("\n>>> Haqiqiy tuzatishni boshlash uchun 'yes' deb yozing, aks holda 'no':")
        answer = input().strip().lower()
        
        if answer == 'yes':
            await recalculate_all_invoices(db, dry_run=False)
        else:
            print("Bekor qilindi.")

if __name__ == "__main__":
    asyncio.run(main())
