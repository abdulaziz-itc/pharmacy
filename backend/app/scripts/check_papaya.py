import asyncio
from app.db.session import AsyncSessionLocal
from app.models.sales import Reservation, ReservationItem, Invoice
from app.models.crm import MedicalOrganization
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        q = select(MedicalOrganization).where(MedicalOrganization.name.ilike('%Папая%'))
        result = await db.execute(q)
        orgs = result.scalars().all()
        for org in orgs:
            print(f"Org: {org.name} (ID: {org.id})")
            
            # get reservations
            res_q = select(Reservation).where(Reservation.med_org_id == org.id)
            res_result = await db.execute(res_q)
            reservations = res_result.scalars().all()
            for r in reservations:
                print(f"  Reservation: {r.id}, is_bonus_eligible: {r.is_bonus_eligible}, is_salary_enabled: {r.is_salary_enabled}")
                
                items_q = select(ReservationItem).where(ReservationItem.reservation_id == r.id)
                items_result = await db.execute(items_q)
                items = items_result.scalars().all()
                for i in items:
                    print(f"    Item: quantity={i.quantity}, price={i.price}, marketing_amount={i.marketing_amount}, salary_amount={i.salary_amount}")

if __name__ == "__main__":
    asyncio.run(main())
