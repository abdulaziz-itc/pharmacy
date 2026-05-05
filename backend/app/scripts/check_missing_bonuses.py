"""
April 30 and May 1 payments missing bonus records.
"""
import asyncio, os, sys
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment, Invoice, Reservation, ReservationItem
from app.models.ledger import BonusLedger, LedgerType
from app.models.crm import MedicalOrganization
from app.models.user import User, UserRole
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as db:
        # Fetch all payments on or after April 30
        p_query = select(Payment).options(
            selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.items),
            selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps)
        ).where(Payment.date >= date(2026, 4, 30))

        payments = (await db.execute(p_query)).scalars().all()
        print(f"Jami {len(payments)} ta 30-aprel va 1-maydagi paymentlar topildi.\n")

        for p in payments:
            if not p.invoice or not p.invoice.reservation:
                continue

            inv = p.invoice
            res = inv.reservation

            # Find already generated BonusLedger for this payment
            l_query = select(BonusLedger).where(BonusLedger.payment_id == p.id)
            ledger_rows = (await db.execute(l_query)).scalars().all()

            if ledger_rows:
                # Bonus already calculated
                continue

            print(f"Payment #{p.id} | Amount: {p.amount:,.2f} UZS | Date: {p.date} | Invoice #{inv.id}")
            print(f"  Comment: '{p.comment}'")
            print(f"  Organization: {res.med_org.name if res.med_org else 'N/A'}")

            # Find assigned MedRep
            target_medrep_id = None
            rep_name = "N/A"
            if res.med_org and res.med_org.assigned_reps:
                for rep in res.med_org.assigned_reps:
                    if rep.role == UserRole.MED_REP:
                        target_medrep_id = rep.id
                        rep_name = rep.full_name
                        break
            
            print(f"  Assigned MedRep: {rep_name} (ID: {target_medrep_id})")

            # Let's calculate the missing bonus
            payment_ratio = p.amount / inv.total_amount if inv.total_amount > 0 else 0
            
            payment_bonus_amount = 0.0
            payment_salary_total = 0.0
            
            for item in res.items:
                if item.marketing_amount:
                    payment_bonus_amount += (item.quantity * item.marketing_amount) * payment_ratio
                if res.is_salary_enabled and item.salary_amount:
                    payment_salary_total += (item.quantity * item.salary_amount) * payment_ratio
            
            payment_bonus_amount = float(round(payment_bonus_amount))
            payment_salary_total = float(round(payment_salary_total))

            print(f"  Hisoblangan Bonus: {payment_bonus_amount:,.2f} UZS | Hisoblangan Zarplata: {payment_salary_total:,.2f} UZS")
            print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
