from sqlalchemy.orm import sessionmaker, selectinload
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, ReservationItem, UnassignedSale
from app.models.crm import MedicalOrganization, Region
from app.models.user import User, UserRole
from sqlalchemy import select, and_, func

async def test_query():
    async with AsyncSessionLocal() as db:
        # Test query setup
        q = (
            select(
                UnassignedSale.med_rep_id,
                UnassignedSale.product_id,
                MedicalOrganization.id.label("org_id"),
                MedicalOrganization.name.label("org_name"),
                Reservation.customer_name,
                Region.name.label("region_name"),
                func.sum(ReservationItem.quantity).label("qty")
            )
            .select_from(UnassignedSale)
            .join(Invoice, UnassignedSale.invoice_id == Invoice.id)
            .join(Reservation, Invoice.reservation_id == Reservation.id)
            .outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
            .outerjoin(Region, MedicalOrganization.region_id == Region.id)
            .join(ReservationItem, and_(
                ReservationItem.reservation_id == Reservation.id,
                ReservationItem.product_id == UnassignedSale.product_id
            ))
            .group_by(
                UnassignedSale.med_rep_id,
                UnassignedSale.product_id,
                MedicalOrganization.id,
                MedicalOrganization.name,
                Reservation.customer_name,
                Region.name
            )
            .limit(5)
        )
        res = await db.execute(q)
        print("Successful query run")
        for row in res.all():
            print(row)

if __name__ == "__main__":
    asyncio.run(test_query())
