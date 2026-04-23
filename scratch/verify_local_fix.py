import asyncio
from datetime import datetime
import sys
import os

# Set up path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import SessionLocal
from app.api.v1.endpoints.analytics import get_global_realtime_dashboard
from app.models.user import UserRole

class MockUser:
    def __init__(self, id, role):
        self.id = id
        self.role = role

async def check_local_stats():
    async with SessionLocal() as db:
        # Create a mock user for Director
        current_user = MockUser(id=1, role=UserRole.DIRECTOR)
        
        # April 2026
        result = await get_global_realtime_dashboard(
            db=db,
            current_user=current_user,
            month=4,
            year=2026
        )
        
        amt = result['sales_fact_received_amount']
        print(f"Fact of Receipts (Aggregate) for April 2026: {amt}")
        
        # The base value for payments only was ~2,293,423,320
        # The top-ups add ~500M (220M + 220M + smaller ones)
        if amt > 2300000000:
            print("--- VERIFICATION SUCCESS ---")
            print("The code works! The total includes top-up transactions.")
        else:
            print("--- VERIFICATION FAILURE ---")
            print("The total still only reflects invoice payments.")

if __name__ == "__main__":
    asyncio.run(check_local_stats())
