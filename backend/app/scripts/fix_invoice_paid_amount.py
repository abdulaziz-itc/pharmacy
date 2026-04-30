"""
Barcha Invoice.paid_amount larni Payment jadvalidagi haqiqiy to'lovlar asosida tuzatadi.
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Payment, InvoiceStatus
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        invoices = (await db.execute(select(Invoice).where(Invoice.status != InvoiceStatus.CANCELLED))).scalars().all()
        
        fixed = 0
        for inv in invoices:
            real_paid = (await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv.id)
            )).scalar() or 0.0
            
            if abs(real_paid - (inv.paid_amount or 0.0)) > 0.01:
                old = inv.paid_amount
                inv.paid_amount = real_paid
                
                if real_paid <= 0:
                    inv.status = InvoiceStatus.UNPAID
                elif real_paid >= inv.total_amount:
                    inv.status = InvoiceStatus.PAID
                else:
                    inv.status = InvoiceStatus.PARTIAL
                
                print(f"Invoice #{inv.id}: {old:,.2f} → {real_paid:,.2f} (diff: {real_paid - old:+,.2f})")
                fixed += 1
        
        await db.commit()
        print(f"\n✅ {fixed} ta faktura tuzatildi.")

if __name__ == "__main__":
    asyncio.run(main())
