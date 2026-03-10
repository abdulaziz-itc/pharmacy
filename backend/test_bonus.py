import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.ledger import BonusLedger
from app.models.sales import ReservationItem, Reservation
from sqlalchemy.orm import selectinload
import sys

async def main():
    try:
        async with AsyncSessionLocal() as db:
            query = select(BonusLedger).options(
                selectinload(BonusLedger.doctor),
                selectinload(BonusLedger.product),
                selectinload(BonusLedger.payment),
                selectinload(BonusLedger.invoice_item).selectinload(ReservationItem.reservation).selectinload(Reservation.invoice)
            ).where(BonusLedger.user_id == 15)
            
            result = await db.execute(query)
            history = result.scalars().all()
            print(f"Found {len(history)} records")
            for h in history:
                p_name = h.product.name if hasattr(h, 'product') and h.product else None
                print(f"ID: {h.id}, Amount: {h.amount}, Product: {p_name}")
            print("Query successful")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
