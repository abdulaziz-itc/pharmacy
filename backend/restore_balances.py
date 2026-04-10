import asyncio
from sqlalchemy import select, func, update
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization, BalanceTransaction

async def restore_balances():
    async with AsyncSessionLocal() as db:
        print("Starting balance restoration...")
        
        # 1. Get all organizations
        orgs = (await db.execute(select(MedicalOrganization))).scalars().all()
        
        for org in orgs:
            # 2. Calculate true balance from transactions
            # Manual top-ups (positive) + surpluses (positive) - applications (negative)
            trans_q = select(func.sum(BalanceTransaction.amount)).where(BalanceTransaction.organization_id == org.id)
            true_balance = (await db.execute(trans_q)).scalar() or 0.0
            
            print(f"Restoring Org {org.id} ({org.name}): Current DB {org.credit_balance:,.2f} -> Correct {true_balance:,.2f}")
            
            # 3. Update the database
            await db.execute(
                update(MedicalOrganization)
                .where(MedicalOrganization.id == org.id)
                .values(credit_balance=float(true_balance))
            )
        
        await db.commit()
        print("Restoration complete.")

if __name__ == "__main__":
    asyncio.run(restore_balances())
