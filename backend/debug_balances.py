import asyncio
from sqlalchemy import select, func, case
from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization
from app.models.sales import Invoice, Reservation, InvoiceStatus

async def debug_balances():
    async with AsyncSessionLocal() as db:
        # 1. Total Debt from Invoices
        total_debt_q = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
        total_debt = (await db.execute(total_debt_q)).scalar() or 0
        print(f"DEBUG: Total Invoice Debt (All): {total_debt:,.2f}")

        # 2. Total Surplus (Overpayments) from Invoices
        total_surplus_q = select(func.sum(Invoice.paid_amount - Invoice.total_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
        total_surplus = (await db.execute(total_surplus_q)).scalar() or 0
        print(f"DEBUG: Total Invoice Surplus (All): {total_surplus:,.2f}")

        # 3. Specific Org (Pro Farm)
        org_q = select(MedicalOrganization).where(MedicalOrganization.name.ilike("%Про Фарм%"))
        org = (await db.execute(org_q)).scalars().first()
        if org:
            print(f"DEBUG: Org 'Pro Farm' ID: {org.id}, DB Credit Balance: {org.credit_balance:,.2f}")
            debt_q = select(
                func.sum(case((Invoice.total_amount > Invoice.paid_amount, Invoice.total_amount - Invoice.paid_amount), else_=0.0)).label("debt"),
                func.sum(case((Invoice.paid_amount > Invoice.total_amount, Invoice.paid_amount - Invoice.total_amount), else_=0.0)).label("surplus")
            ).join(Reservation, Reservation.id == Invoice.reservation_id)\
             .where(Reservation.med_org_id == org.id)\
             .where(Invoice.status != InvoiceStatus.CANCELLED)
            
            res = (await db.execute(debt_q)).first()
            print(f"DEBUG: 'Pro Farm' Calculated Debt: {res.debt:,.2f}, Calculated Surplus: {res.surplus:,.2f}")

if __name__ == "__main__":
    asyncio.run(debug_balances())
