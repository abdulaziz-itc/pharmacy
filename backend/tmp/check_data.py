import asyncio
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.sales import DoctorFactAssignment
from app.models.visit import VisitPlan

async def check():
    async with SessionLocal() as db:
        # Check Assignments for April 2024 (Wait! Today is 2026-04-03)
        res = await db.execute(select(func.distinct(DoctorFactAssignment.doctor_id)).where(DoctorFactAssignment.month == 4, DoctorFactAssignment.year == 2026))
        docs_from_fact = res.scalars().all()
        print(f"Doctors from facts (April 2026): {docs_from_fact}")
        
        # Check Visits for April 2026
        res_v = await db.execute(select(func.distinct(VisitPlan.doctor_id)).where(VisitPlan.planned_date >= '2026-04-01', VisitPlan.planned_date <= '2026-04-30'))
        docs_from_visits = res_v.scalars().all()
        print(f"Doctors from visits (April 2026): {docs_from_visits}")

if __name__ == "__main__":
    asyncio.run(check())
