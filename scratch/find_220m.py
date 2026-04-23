from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.crm import BalanceTransaction, BalanceTransactionType, MedicalOrganization
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # 1. Total count and sum of TOPUPs
        q = select(func.count(BalanceTransaction.id), func.sum(BalanceTransaction.amount)).where(
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        )
        res = await db.execute(q)
        count, total = res.first()
        print(f"Total TOPUPs: {count} entries, Total amount: {total:,.2f}")
        
        # 2. Recent TOPUPs
        q_recent = select(BalanceTransaction).options(
            # No options needed for now
        ).where(
            BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP
        ).order_by(BalanceTransaction.created_at.desc()).limit(10)
        
        res_recent = await db.execute(q_recent)
        txs = res_recent.scalars().all()
        print("\nRecent TOPUPs:")
        for tx in txs:
            print(f"ID: {tx.id}, Amount: {tx.amount:,.2f}, OrgID: {tx.organization_id}, Created: {tx.created_at}, Type: {tx.transaction_type}")
            
        # 3. Check for specific amount 220,000,000
        q_spec = select(BalanceTransaction).where(
            BalanceTransaction.amount == 220000000
        )
        res_spec = await db.execute(q_spec)
        spec_txs = res_spec.scalars().all()
        print(f"\nFound {len(spec_txs)} transactions with exactly 220,000,000")
        for tx in spec_txs:
            print(f"ID: {tx.id}, Type: {tx.transaction_type}, OrgID: {tx.organization_id}, Created: {tx.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
