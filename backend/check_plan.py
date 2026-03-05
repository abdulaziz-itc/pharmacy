import asyncio
import os
import sys

# Add the backend directory to python path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.sales import Plan
from app.models.crm import Doctor

async def main():
    try:
        async with AsyncSessionLocal() as db:
            query = select(Plan, Doctor.full_name).outerjoin(Doctor, Plan.doctor_id == Doctor.id).where(Plan.doctor_id != None)
            result = await db.execute(query)
            rows = result.fetchall()
            print("Plans assigned to doctors:")
            for plan, doc_name in rows:
                 print(f"Plan ID: {plan.id}, Doc: {plan.doctor_id} ({doc_name}), Product: {plan.product_id}, target_qty: {plan.target_quantity}, target_amt: {plan.target_amount}, Month: {plan.month}, Year: {plan.year}")
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
