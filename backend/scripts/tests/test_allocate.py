import asyncio
from app.db.session import AsyncSessionLocal
from app.services.finance_service import FinancialService

async def test_allocate():
    async with AsyncSessionLocal() as db:
        try:
            # Let's test with med_rep_id=15, doctor_id=10, amount=25000, target_month=3, target_year=2026, product_id=...
            # Assume doctor_id=10 exists (usually auto-increment generates 1-something, let's just pick one or 2)
            from sqlalchemy import select
            from app.models.crm import Doctor
            doc = (await db.execute(select(Doctor))).scalars().first()
            if not doc:
                print("No doctors found!")
                return
            doctor_id = doc.id
            print(f"Using doctor_id={doctor_id}")

            await FinancialService.allocate_bonus(
                db=db,
                med_rep_id=15,
                doctor_id=doctor_id,
                amount=25000,
                target_month=3,
                target_year=2026,
            )
            print("Successfully allocated without product")
            
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_allocate())
