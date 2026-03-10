import asyncio
from app.db.session import AsyncSessionLocal
from app.models.ledger import BonusLedger
from sqlalchemy import select

async def fix_notes():
    async with AsyncSessionLocal() as db:
        query = select(BonusLedger)
        ledgers = (await db.execute(query)).scalars().all()
        for l in ledgers:
            if l.notes and "Bonus accrued from Invoice" in l.notes:
                l.notes = l.notes.replace("Bonus accrued from Invoice", "Бонус начислен по счет-фактуре").replace("Pharmacy:", "Аптека:")
        await db.commit()
        print("Done")

if __name__ == "__main__":
    asyncio.run(fix_notes())
