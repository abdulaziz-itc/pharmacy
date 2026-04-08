import asyncio
import os
import sys
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, Payment, InvoiceStatus
from app.models.crm import MedicalOrganization, BalanceTransaction
from app.crud.crud_sales import top_up_organization_balance, apply_balance_to_invoice

async def test_kreditorka():
    async with AsyncSessionLocal() as db:
        # 1. Fetch an organization
        res_org = await db.execute(select(MedicalOrganization).limit(1))
        org = res_org.scalar_one_or_none()
        if not org:
            print("No organization found. Skipping test.")
            return

        print(f"Testing for Org: {org.name} (ID: {org.id}), Initial Balance: {org.credit_balance}")

        # 2. Test manual top-up with debt settlement
        # For simplicity, we'll just check if the function runs and records a transaction
        initial_balance = org.credit_balance or 0.0
        top_up_amount = 100000.0
        
        await top_up_organization_balance(
            db, 
            organization_id=org.id, 
            amount=top_up_amount, 
            comment="Test top up", 
            user_id=1
        )
        
        await db.refresh(org)
        print(f"New Balance after {top_up_amount} top-up: {org.credit_balance}")
        
        # 3. Verify BalanceTransaction
        res_tx = await db.execute(
            select(BalanceTransaction)
            .where(BalanceTransaction.organization_id == org.id)
            .order_by(BalanceTransaction.id.desc())
            .limit(1)
        )
        tx = res_tx.scalar_one_or_none()
        if tx:
            print(f"Last Transaction: {tx.transaction_type}, Amount: {tx.amount}, Comment: {tx.comment}")

        print("Test completed successfully.")

if __name__ == "__main__":
    asyncio.run(test_kreditorka())
