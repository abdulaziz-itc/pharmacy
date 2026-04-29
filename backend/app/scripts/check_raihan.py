import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.ledger import BonusLedger
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.full_name.ilike('%Райхан%')))
        medrep = user_res.scalars().first()
        
        if not medrep:
            print("Medrep topilmadi.")
            return
            
        print(f"Medrep: {medrep.full_name} (ID: {medrep.id})")
        
        entries_res = await db.execute(
            select(BonusLedger)
            .where(BonusLedger.user_id == medrep.id)
            .order_by(BonusLedger.created_at.asc())
        )
        entries = entries_res.scalars().all()
        
        print(f"{'ID':<5} | {'Date':<20} | {'Type':<10} | {'Cat':<6} | {'Amount':<15} | {'is_paid'} | {'notes'}")
        print("-" * 80)
        for e in entries:
            dt = e.created_at.strftime('%Y-%m-%d %H:%M')
            print(f"{e.id:<5} | {dt:<20} | {e.ledger_type:<10} | {e.ledger_category:<6} | {e.amount:<15.0f} | {e.is_paid} | {e.notes}")

if __name__ == "__main__":
    asyncio.run(main())
