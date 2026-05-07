import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints.analytics import get_comprehensive_stats
from app.models.user import User, UserRole
from fastapi import HTTPException

async def check():
    async with AsyncSessionLocal() as db:
        class MockUser:
            id = 1
            role = UserRole.DIRECTOR
        
        # We need a proper user from DB to avoid lazy loading issues
        user = await db.execute(select(User).limit(1))
        user = user.scalar()
        if user:
            user.role = UserRole.DIRECTOR
            try:
                res = await get_comprehensive_stats(db=db, current_user=user)
                print("Gross Profit:", res["kpis"]["gross_profit"])
                print("Net Profit:", res["kpis"]["net_profit"])
                print("Total Expenses:", res["kpis"]["total_expenses"])
                print("Other Expenses:", res["kpis"]["other_expenses"])
                print("Fact sum:", res["kpis"]["sales_fact_received_amount"])
                print("Predinvest:", res["kpis"]["total_predinvest"])
            except Exception as e:
                print("Error:", e)
        else:
            print("No users found")

from sqlalchemy import select
asyncio.run(check())
