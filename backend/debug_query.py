import asyncio
from sqlalchemy import select, func, case
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization
from app.models.sales import Invoice, Reservation, InvoiceStatus

async def debug_query():
    async with AsyncSessionLocal() as db:
        # Subquery
        debt_sub = select(
            Reservation.med_org_id,
            func.sum(case((Invoice.total_amount > Invoice.paid_amount, Invoice.total_amount - Invoice.paid_amount), else_=0.0)).label("total_debt")
        ).join(Invoice, Reservation.id == Invoice.reservation_id)\
         .where(Invoice.status != InvoiceStatus.CANCELLED)\
         .group_by(Reservation.med_org_id).subquery()

        # Check subquery directly
        res = await db.execute(select(debt_sub).limit(5))
        print("SUBQUERY PREVIEW (MedOrgID, Debt):")
        for row in res.all():
            print(row)

if __name__ == "__main__":
    asyncio.run(debug_query())
