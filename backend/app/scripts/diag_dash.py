import asyncio
from app.db.session import AsyncSessionLocal
from app.models.crm import Region, MedicalOrganization
from app.models.sales import Plan, Reservation, Invoice, Payment
from sqlalchemy import select, func, and_

async def diagnose_data():
    async with AsyncSessionLocal() as db:
        # 1. Find Kashkadarya
        reg_res = await db.execute(select(Region).where(Region.name.ilike('%кашка%')))
        reg = reg_res.scalar_one_or_none()
        
        if not reg:
            print("Region 'Kashkadarya' not found.")
            reg_res = await db.execute(select(Region).limit(1))
            reg = reg_res.scalar_one()
            print(f"Using first available region: {reg.name} (ID: {reg.id})")
        else:
            print(f"Found Kashkadarya: ID {reg.id}")

        reg_id = reg.id
        
        # 2. Check plans
        all_plans = (await db.execute(select(func.sum(Plan.target_amount)))).scalar() or 0.0
        print(f"Total Plans in DB: {all_plans:,.2f}")
        
        plans_with_org = (await db.execute(select(func.sum(Plan.target_amount)).where(Plan.med_org_id.isnot(None)))).scalar() or 0.0
        print(f"Plans WITH med_org_id: {plans_with_org:,.2f}")

        plans_without_org = (await db.execute(select(func.sum(Plan.target_amount)).where(Plan.med_org_id.is_(None)))).scalar() or 0.0
        print(f"Plans WITHOUT med_org_id: {plans_without_org:,.2f}")
        
        # Current filter method for this region
        filtered_plan_q = select(func.sum(Plan.target_amount)).join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == reg_id)
        filtered_plan = (await db.execute(filtered_plan_q)).scalar() or 0.0
        print(f"Filtered Plans for Reg {reg_id} (Current Strict Join Logic): {filtered_plan:,.2f}")

        # 3. Check Total Sales
        all_sales = (await db.execute(select(func.sum(Payment.amount)))).scalar() or 0.0
        print(f"Total Payments in DB: {all_sales:,.2f}")
        
        # Let's check strict join count
        strict_join_q = select(func.sum(Payment.amount)).select_from(Payment).join(Invoice, Payment.invoice_id == Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id).join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
        strict_join_sales = (await db.execute(strict_join_q)).scalar() or 0.0
        print(f"Payments with Valid MedOrg Relationship: {strict_join_sales:,.2f}")

if __name__ == "__main__":
    asyncio.run(diagnose_data())
