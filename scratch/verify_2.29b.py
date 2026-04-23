from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.sales import Payment, Invoice, Reservation
from app.models.crm import BalanceTransaction, BalanceTransactionType, MedicalOrganization
from app.models.ledger import BonusLedger, LedgerType
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # Find AJINIYAZ NUKUS
        q = select(MedicalOrganization).where(MedicalOrganization.name.ilike("%АЖИНИЯЗ НУКУС%"))
        res = await db.execute(q)
        org = res.scalars().first()
        
        if not org:
            print("Org not found")
            return
            
        print(f"Org: {org.name} (ID: {org.id})")
        print(f"Credit Balance Column: {org.credit_balance}")
        
        # Check TOPUP Transactions
        q_tx = select(func.sum(BalanceTransaction.amount)).where(
            BalanceTransaction.organization_id == org.id,
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        )
        res_tx = await db.execute(q_tx)
        topup_sum = res_tx.scalar() or 0.0
        print(f"Total TOPUP entries: {topup_sum:,.2f}")
        
        # Check Payments
        q_pay = select(func.sum(Payment.amount)).join(Invoice).join(Reservation).where(
            Reservation.med_org_id == org.id
        )
        res_pay = await db.execute(q_pay)
        pay_sum = res_pay.scalar() or 0.0
        print(f"Total Payments (Fact): {pay_sum:,.2f}")
        
        print(f"Total Receipts for this org: {(topup_sum + pay_sum):,.2f}")
        
        # GLOBAL TOTALS (matching dashboard card)
        gp_q = select(func.sum(Payment.amount))
        global_p = (await db.execute(gp_q)).scalar() or 0.0
        
        gt_q = select(func.sum(BalanceTransaction.amount)).where(
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        )
        global_t = (await db.execute(gt_q)).scalar() or 0.0
        
        print(f"\nGLOBAL Fact of Receipts: {(global_p + global_t):,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
