import asyncio
import sys
import os

# Add the parent directory to the path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import delete
from app.db.session import AsyncSessionLocal, engine
from app.models.ledger import BonusLedger, DoctorMonthlyStat
from app.models.sales import BonusPayment, DoctorFactAssignment, UnassignedSale

async def clear_bonus_data():
    print("Starting bonus data cleanup...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Clear Bonus Ledger
            print("Clearing BonusLedger...")
            await db.execute(delete(BonusLedger))
            
            # 2. Clear Bonus Payments
            print("Clearing BonusPayment...")
            await db.execute(delete(BonusPayment))
            
            # 3. Clear Doctor Fact Assignments
            print("Clearing DoctorFactAssignment...")
            await db.execute(delete(DoctorFactAssignment))
            
            # 4. Clear Doctor Monthly Stats
            print("Clearing DoctorMonthlyStat...")
            await db.execute(delete(DoctorMonthlyStat))
            
            # 5. Clear Unassigned Sales
            print("Clearing UnassignedSale...")
            await db.execute(delete(UnassignedSale))
            
            await db.commit()
            print("Successfully cleared all bonus data.")
        except Exception as e:
            await db.rollback()
            print(f"Error during cleanup: {e}")
            raise e
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(clear_bonus_data())
