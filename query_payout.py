import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath("backend/app/main.py")))

from app.db.session import SessionLocal
from app.models.sales import BonusLedger
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check():
    async with SessionLocal() as db:
        result = await db.execute(
            select(BonusLedger)
            .join(User)
            .where(User.full_name.ilike('%Шерматов Ойбек%'))
            .where(BonusLedger.amount.in_([144637, 82809, 144637.00, 82809.00]))
        )
        entries = result.scalars().all()
        for e in entries:
            print(f"ID: {e.id} | Date: {e.created_at} | Type: {e.ledger_type} | Category: {e.ledger_category} | Amount: {e.amount} | Notes: {e.notes} | is_paid: {e.is_paid}")

asyncio.run(check())
