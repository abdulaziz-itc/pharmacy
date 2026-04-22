from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.crm import MedicalOrganization, BalanceTransaction, BalanceTransactionType
from app.models.sales import Invoice, InvoiceStatus, Reservation
import asyncio

async def check():
    async with SessionLocal() as db:
        # Find AJINIYAZ NUKUS
        q = select(MedicalOrganization).where(MedicalOrganization.name.ilike("%АЖИНИЯЗ НУКУС%"))
        res = await db.execute(q)
        org = res.scalars().first()
        
        if not org:
            print("Org not found")
            return
            
        print(f"Org: {org.name} (ID: {org.id})")
        print(f"Credit Balance Column: {org.credit_balance}")
        
        # Check Transactions
        q_tx = select(BalanceTransaction).where(BalanceTransaction.organization_id == org.id)
        res_tx = await db.execute(q_tx)
        txs = res_tx.scalars().all()
        print(f"Transactions found: {len(txs)}")
        for tx in txs:
            print(f"  - {tx.transaction_type}: {tx.amount} ({tx.created_at})")
            
        # Check Invoices
        q_inv = select(Invoice).join(Reservation).where(Reservation.med_org_id == org.id)
        res_inv = await db.execute(q_inv)
        invs = res_inv.scalars().all()
        print(f"Invoices found: {len(invs)}")
        for inv in invs:
            print(f"  - Invoice {inv.id}: Total {inv.total_amount}, Paid {inv.paid_amount}, Status {inv.status}")

if __name__ == "__main__":
    asyncio.run(check())
