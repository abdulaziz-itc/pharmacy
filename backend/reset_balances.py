import asyncio
from sqlalchemy import update
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization

async def reset_balances():
    async with AsyncSessionLocal() as db:
        print("RESETTING ALL CREDIT BALANCES TO 0.0 TO CLEAR CORRUPTION...")
        await db.execute(update(MedicalOrganization).values(credit_balance=0.0))
        await db.commit()
        print("Reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_balances())
