
import asyncio
import logging
from sqlalchemy import delete, and_
from app.db.session import AsyncSessionLocal
from app.models.sales import DoctorFactAssignment
from app.models.ledger import DoctorMonthlyStat

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def clear_april_data():
    async with AsyncSessionLocal() as db:
        logging.info("STARTING APRIL 2026 FACT ASSIGNMENTS CLEARING...")
        
        try:
            # 1. Delete actual assignments to doctors for April 2026
            # This is the "Факт: 1" you see in the doctor row
            logging.info("Deleting entries in doctor_fact_assignment for April 2026...")
            stmt = delete(DoctorFactAssignment).where(
                and_(
                    DoctorFactAssignment.month == 4,
                    DoctorFactAssignment.year == 2026
                )
            )
            await db.execute(stmt)
            
            # 2. Also clear the aggregate statistics again to be 100% sure
            logging.info("Clearing doctor_monthly_stat to ensure clean dashboard...")
            await db.execute(delete(DoctorMonthlyStat))
            
            await db.commit()
            logging.info("DATA CLEARED SUCCESSFULLY.")
            logging.info("IMPORTANT: You MUST RESTART the Python Application in cPanel.")
        except Exception as e:
            await db.rollback()
            logging.error(f"CLEARING FAILED! Rollback performed. Error: {e}")

if __name__ == "__main__":
    asyncio.run(clear_april_data())
