
import asyncio
from sqlalchemy import select, and_, extract, or_
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, Payment, UnassignedSale

async def find_all_recent_data():
    async with AsyncSessionLocal() as db:
        print("--- RECENT INVOICES (Last 10) ---")
        stmt = select(Invoice).order_by(Invoice.id.desc()).limit(10)
        result = await db.execute(stmt)
        invoices = result.scalars().all()
        for inv in invoices:
            print(f"ID: {inv.id}, Num: {inv.factura_number}, Total: {inv.total_amount}, Realization: {inv.realization_date}, Created: {inv.date}, Status: {inv.status}")
            
        print("\n--- RECENT PAYMENTS (Last 10) ---")
        stmt = select(Payment).order_by(Payment.id.desc()).limit(10)
        result = await db.execute(stmt)
        payments = result.scalars().all()
        for p in payments:
            print(f"ID: {p.id}, InvID: {p.invoice_id}, Amount: {p.amount}, Date: {p.date}")

        print("\n--- SEARCHING FOR 360,000 UZS ---")
        stmt = select(Invoice).where(or_(Invoice.total_amount == 360000, Invoice.paid_amount == 360000))
        result = await db.execute(stmt)
        matching_invoices = result.scalars().all()
        for inv in matching_invoices:
            print(f"MATCHING INVOICE -> ID: {inv.id}, Num: {inv.factura_number}, Amount: {inv.total_amount}")

        stmt = select(Payment).where(Payment.amount == 360000)
        result = await db.execute(stmt)
        matching_payments = result.scalars().all()
        for p in matching_payments:
            print(f"MATCHING PAYMENT -> ID: {p.id}, InvID: {p.invoice_id}, Amount: {p.amount}, Date: {p.date}")

if __name__ == "__main__":
    asyncio.run(find_all_recent_data())
