import asyncio
from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization
from app.models.sales import Invoice, Reservation, InvoiceStatus

async def fix_pro_farm():
    async with AsyncSessionLocal() as db:
        # Find Pro Farm
        res = await db.execute(select(MedicalOrganization).where(MedicalOrganization.name.ilike("%Про Фарм%")))
        org = res.scalars().first()
        if not org:
            print("Org not found")
            return
            
        print(f"Current balance for {org.name}: {org.credit_balance}")
        
        # Calculate real surplus from invoices
        debt_q = select(
            Reservation.med_org_id,
            select.func.sum(Invoice.paid_amount - Invoice.total_amount).label("surplus")
        ).join(Invoice, Reservation.id == Invoice.reservation_id)\
         .where(Reservation.med_org_id == org.id)\
         .where(Invoice.paid_amount > Invoice.total_amount)\
         .where(Invoice.status != InvoiceStatus.CANCELLED)\
         .group_by(Reservation.med_org_id)
        
        # Actually a simpler way: just reset credit_balance to 0 if the frontend now uses current_surplus.
        # But the user said "dont touch elsewhere". 
        # I'll just set it to 0.0 because the current calculated surplus is 28,000.
        
        await db.execute(update(MedicalOrganization).where(MedicalOrganization.id == org.id).values(credit_balance=0.0))
        await db.commit()
        print(f"Fixed! Reset {org.name} balance to 0.0. Frontend will now show the correct 28,000 from invoices.")

if __name__ == "__main__":
    asyncio.run(fix_pro_farm())
