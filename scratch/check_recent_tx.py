from sqlalchemy import select, func, text
from app.db.session import AsyncSessionLocal
from datetime import datetime, timedelta
import asyncio

async def check():
    async with AsyncSessionLocal() as db:
        # 1. Any BalanceTransaction created in the last 3 days
        yesterday = datetime.utcnow() - timedelta(days=3)
        res = await db.execute(text("SELECT id, organization_id, amount, transaction_type, created_at FROM balance_transaction WHERE created_at > :d"), {"d": yesterday})
        rows = res.all()
        print(f"Transactions in the last 3 days: {len(rows)}")
        for r in rows:
            print(r)
            
        # 2. Sum of all TOPUPs today
        today = datetime.utcnow().date()
        res_today = await db.execute(text("SELECT SUM(amount) FROM balance_transaction WHERE transaction_type = 'topup' AND created_at >= :d"), {"d": today})
        total_today = res_today.scalar() or 0
        print(f"\nTotal Topups today: {total_today:,.2f}")

if __name__ == "__main__":
    asyncio.run(check())
