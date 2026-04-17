import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.crm import BalanceTransaction

async def check_tx():
    org_id = 202
    async with SessionLocal() as db:
        result = await db.execute(select(BalanceTransaction).where(BalanceTransaction.organization_id == org_id))
        txs = result.scalars().all()
        print(f"Transactions for Org {org_id}: {len(txs)}")
        for t in txs:
            print(f"ID: {t.id}, Amount: {t.amount}, Type: {t.transaction_type}, Created: {t.created_at}")

if __name__ == "__main__":
    asyncio.run(check_tx())
