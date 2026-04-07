
import asyncio
import logging
from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.models.ledger import DoctorMonthlyStat

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def clear_dashboard_stats():
    async with AsyncSessionLocal() as db:
        logging.info("STARTING STATISTICS CLEARING...")
        
        try:
            # Delete entries in DoctorMonthlyStat
            # This table stores the aggregated sales/payment data for the dashboard
            logging.info("Deleting entries in doctor_monthly_stat...")
            await db.execute(delete(DoctorMonthlyStat))
            
            await db.commit()
            logging.info("STATISTICS TABLE CLEARED SUCCESSFULLY.")
            logging.info("IMPORTANT: You MUST RESTART the Python Application in cPanel for changes to appear.")
        except Exception as e:
            await db.rollback()
            logging.error(f"CLEARING FAILED! Rollback performed. Error: {e}")

if __name__ == "__main__":
    asyncio.run(clear_dashboard_stats())
