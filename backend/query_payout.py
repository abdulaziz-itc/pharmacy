import asyncio
import os
import sys

sys.path.append(os.path.abspath("."))

from app.db.session import SessionLocal
from app.models.sales import BonusLedger
from app.models.user import User
from sqlalchemy import select

async def check():
    async with SessionLocal() as db:
        result = await db.execute(
            select(BonusLedger, User)
            .join(User)
            .where(User.full_name.ilike('%Шерматов Ойбек%'))
            .where(BonusLedger.amount.in_([144637, 82809, 144637.00, 82809.00]))
        )
        for row in result:
            e = row[0]
            u = row[1]
            print(f"ID: {e.id} | MedRep: {u.full_name} | Date: {e.created_at} | Type: {e.ledger_type} | Category: {e.ledger_category} | Amount: {e.amount} | Notes: {e.notes}")

asyncio.run(check())
