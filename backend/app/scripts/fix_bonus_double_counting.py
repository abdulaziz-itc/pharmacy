import asyncio
import os
import sys

# Backend yo'lini qo'shish
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.sales import BonusLedger, LedgerType
from sqlalchemy import select

async def fix_bonus_double_counting():
    print("Starting database cleanup for bonus double counting...")
    async with SessionLocal() as db:
        # Eski "Аванс" deb yozilgan, lekin tizim xato ACCRUAL qilib yuborgan yozuvlarni topamiz
        result = await db.execute(
            select(BonusLedger)
            .where(BonusLedger.ledger_type == LedgerType.ACCRUAL)
            .where(BonusLedger.notes.ilike('%Аванс (Предынвест)%'))
        )
        entries = result.scalars().all()
        
        count = 0
        for entry in entries:
            print(f"Found error entry -> ID: {entry.id}, MedRep ID: {entry.user_id}, Amount: {entry.amount:,.0f}, Notes: '{entry.notes}'")
            # To'g'ri turga o'zgartiramiz
            entry.ledger_type = LedgerType.PAYOUT
            entry.notes = "Выплачено (доп. сумма)"
            count += 1
            
        if count > 0:
            await db.commit()
            print(f"✅ Successfully fixed {count} entries!")
        else:
            print("✅ No entries found that need fixing. Database is clean.")

if __name__ == "__main__":
    asyncio.run(fix_bonus_double_counting())
