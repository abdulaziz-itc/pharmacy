import asyncio
from datetime import datetime
from sqlalchemy import select, func, and_, or_
from app.db.session import SessionLocal
from app.models.sales import Payment, Invoice, Reservation
from app.models.crm import BalanceTransaction, MedicalOrganization
from app.models.user import User, UserRole

async def test_excel_logic():
    async with SessionLocal() as db:
        # April 2026
        start_date = datetime(2026, 4, 1)
        end_date = datetime(2026, 5, 1)
        
        # 1. Invoiced Payments Query
        pay_q = select(Payment).join(Invoice, Payment.invoice_id == Invoice.id)
        pay_q = pay_q.where(and_(Payment.date >= start_date, Payment.date < end_date))
        pay_q = pay_q.join(Reservation, Invoice.reservation_id == Reservation.id)
        
        # 2. Standalone Refills Query
        top_q = select(BalanceTransaction).where(
            or_(
                BalanceTransaction.transaction_type == "topup",
                and_(BalanceTransaction.transaction_type == "adjustment", BalanceTransaction.amount > 0)
            )
        )
        top_q = top_q.where(and_(BalanceTransaction.created_at >= start_date, BalanceTransaction.created_at < end_date))
        
        pay_count = len((await db.execute(pay_q)).scalars().all())
        top_count = len((await db.execute(top_q)).scalars().all())
        
        print(f"Payments in April: {pay_count}")
        print(f"Top-ups in April: {top_count}")
        
        # Check specific top-up mentioned by user (220M)
        res = await db.execute(top_q.where(BalanceTransaction.amount == 220000000))
        found = res.scalars().all()
        print(f"Found 220M top-up: {len(found)}")
        if found:
            for f in found:
                print(f"  ID: {f.id}, Type: {f.transaction_type}, Created: {f.created_at}")

if __name__ == "__main__":
    asyncio.run(test_excel_logic())
