import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from datetime import datetime

async def main():
    async with AsyncSessionLocal() as db:
        # Sum payments
        pay_res = await db.execute(text("SELECT SUM(amount) FROM payment WHERE date >= '2026-04-01'"))
        pay_sum = pay_res.scalar() or 0
        
        # Sum topups
        top_res = await db.execute(text("SELECT SUM(amount), transaction_type FROM balance_transaction WHERE created_at >= '2026-04-01' GROUP BY transaction_type"))
        top_sums = top_res.fetchall()
        
        # Dump latest 5 topups
        latest = await db.execute(text("SELECT amount, transaction_type, comment, created_at FROM balance_transaction ORDER BY created_at DESC LIMIT 5"))
        latest_res = latest.fetchall()
        
        print("Payment Sum (April):", pay_sum)
        print("Balance Transaction Sums by Type (April):")
        for st in top_sums:
            print("  ", st)
        print("Latest Balance Transactions:")
        for l in latest_res:
            print("  ", l)

if __name__ == '__main__':
    asyncio.run(main())
