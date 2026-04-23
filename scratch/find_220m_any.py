from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.crm import BalanceTransaction, BalanceTransactionType, MedicalOrganization
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # 1. Check all types of balance transactions
        q_types = select(BalanceTransaction.transaction_type, func.count(BalanceTransaction.id), func.sum(BalanceTransaction.amount)).group_by(BalanceTransaction.transaction_type)
        res_types = await db.execute(q_types)
        print("Balance Transaction Types in DB:")
        for ttype, count, total in res_types.all():
            print(f"Type: {ttype}, Count: {count}, Total: {total:,.2f}")
            
        # 2. Search for the specific amount 220,000,000 in ANY table (BalanceTransaction or Payment)
        from app.models.sales import Payment
        q_p = select(Payment).where(Payment.amount == 220000000)
        res_p = await db.execute(q_p)
        ps = res_p.scalars().all()
        print(f"\nFound {len(ps)} Payments with amount 220,000,000")
        for p in ps:
            print(f"Payment ID: {p.id}, Amount: {p.amount}, Date: {p.date}, InvoiceID: {p.invoice_id}")

        q_bt = select(BalanceTransaction).where(BalanceTransaction.amount == 220000000)
        res_bt = await db.execute(q_bt)
        bts = res_bt.scalars().all()
        print(f"\nFound {len(bts)} BalanceTransactions with amount 220,000,000")
        for bt in bts:
            print(f"BT ID: {bt.id}, Type: {bt.transaction_type}, Amount: {bt.amount}, Date: {bt.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
