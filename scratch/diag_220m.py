from sqlalchemy import select, func, text
from app.db.session import AsyncSessionLocal
from app.models.sales import Payment, Invoice, Reservation
from app.models.crm import BalanceTransaction, MedicalOrganization
import asyncio
import json

async def check():
    async with AsyncSessionLocal() as db:
        print("--- Diagnostic Search for 220,000,000 UZS ---")
        
        # 1. Search in BalanceTransaction
        bt_q = select(BalanceTransaction).where(BalanceTransaction.amount == 220000000)
        bt_res = await db.execute(bt_q)
        bt_rows = bt_res.scalars().all()
        print(f"Found {len(bt_rows)} BalanceTransactions:")
        for bt in bt_rows:
            print(f"  ID: {bt.id}, Type: {bt.transaction_type}, Org: {bt.organization_id}, Created: {bt.created_at}")
            
        # 2. Search in Payment
        p_q = select(Payment).where(Payment.amount == 220000000)
        p_res = await db.execute(p_q)
        p_rows = p_res.scalars().all()
        print(f"Found {len(p_rows)} Payments:")
        for p in p_rows:
            print(f"  ID: {p.id}, Date: {p.date}, Invoice: {p.invoice_id}")
            
        # 3. Check Global Sums from Accountant Dashboard Perspective
        # (This is what usually appears on the card)
        pmt_sum_q = select(func.sum(Payment.amount))
        pmt_sum = (await db.execute(pmt_sum_q)).scalar() or 0.0
        
        tp_sum_q = select(func.sum(BalanceTransaction.amount)).where(
            text("transaction_type = 'topup'")
        )
        tp_sum = (await db.execute(tp_sum_q)).scalar() or 0.0
        
        print(f"\nGlobal Stats in DB:")
        print(f"  Total Payments: {pmt_sum:,.2f}")
        print(f"  Total Topups:   {tp_sum:,.2f}")
        print(f"  Fact Sum:       {(pmt_sum + tp_sum):,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
