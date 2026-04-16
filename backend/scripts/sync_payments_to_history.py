import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.sales import Payment, Invoice, Reservation
from app.models.crm import BalanceTransaction, BalanceTransactionType

async def sync_payments():
    print("Starting payment synchronization to balance history...")
    async with SessionLocal() as db:
        # 1. Fetch all payments with related invoice/org data
        stmt = select(Payment).options(
            selectinload(Payment.invoice).selectinload(Invoice.reservation)
        )
        result = await db.execute(stmt)
        payments = result.scalars().all()
        
        print(f"Found {len(payments)} total payments. Checking for missing entries in history...")
        
        created_count = 0
        for p in payments:
            if not p.invoice or not p.invoice.reservation:
                continue
                
            org_id = p.invoice.reservation.med_org_id
            if not org_id:
                continue
                
            # 2. Check if a corresponding BalanceTransaction exists
            # We look for APPLICATION type for this invoice and amount
            bt_stmt = select(BalanceTransaction).where(
                BalanceTransaction.organization_id == org_id,
                BalanceTransaction.related_invoice_id == p.invoice_id,
                BalanceTransaction.amount == p.amount,
                BalanceTransaction.transaction_type == BalanceTransactionType.APPLICATION
            )
            bt_res = await db.execute(bt_stmt)
            if bt_res.scalars().first():
                continue # Already exists
            
            # 3. Create missing BalanceTransaction
            bt = BalanceTransaction(
                organization_id=org_id,
                amount=p.amount,
                transaction_type=BalanceTransactionType.APPLICATION,
                related_invoice_id=p.invoice_id,
                comment=p.comment or f"Оплата счета #{p.invoice.factura_number or p.invoice_id}",
                created_at=p.date # Maintain original timing
            )
            db.add(bt)
            created_count += 1
            
        if created_count > 0:
            print(f"Synchronizing {created_count} missing transactions...")
            await db.commit()
            print("Successfully synchronized history.")
        else:
            print("All payments are already in history. No action needed.")

if __name__ == "__main__":
    asyncio.run(sync_payments())
