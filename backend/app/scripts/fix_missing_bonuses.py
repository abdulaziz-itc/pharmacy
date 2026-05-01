"""
Script to fix/accrue missing bonuses for any payments from April 1 to May 1.
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
        # Fetch all payments on or after April 1, 2026
        # To make sure we capture both 30-April and 1-May properly
        p_query = select(Payment).options(
            selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.items),
            selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps)
        ).where(Payment.date >= date(2026, 4, 1))

        payments = (await db.execute(p_query)).scalars().all()
        print(f"Jami {len(payments)} ta payment topildi (01.04.2026 dan boshlab).\n")

        added_bonuses = 0
        for p in payments:
            if not p.invoice or not p.invoice.reservation:
                continue

            inv = p.invoice
            res = inv.reservation

            # Check if BonusLedger already exists for this payment
            l_query = select(BonusLedger).where(BonusLedger.payment_id == p.id)
            ledger_rows = (await db.execute(l_query)).scalars().all()

            if ledger_rows:
                # Bonus already calculated
                continue

            # Determine MedRep assigned to pharmacy
            target_medrep_id = None
            if res.med_org and res.med_org.assigned_reps:
                for rep in res.med_org.assigned_reps:
                    if rep.role == UserRole.MED_REP:
                        target_medrep_id = rep.id
                        break
            
            if not target_medrep_id:
                continue

            # Calculate bonus and salary for this payment
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

            if payment_bonus_amount > 0 or payment_salary_total > 0:
                print(f"Payment #{p.id} | Amount: {p.amount:,.2f} UZS | Date: {p.date} | Invoice #{inv.id}")
                print(f"  Comment: '{p.comment}'")
                
                now = datetime.utcnow()
                if payment_bonus_amount > 0:
                    accrual_bonus = BonusLedger(
                        user_id=target_medrep_id,
                        amount=payment_bonus_amount,
                        ledger_type=LedgerType.ACCRUAL,
                        ledger_category="bonus",
                        payment_id=p.id,
                        target_month=now.month,
                        target_year=now.year,
                        notes=f"Бонус начислен по счет-фактуре #{inv.id} (Аптека: {res.med_org.name if res.med_org else 'N/A'})"
                    )
                    db.add(accrual_bonus)

                if payment_salary_total > 0:
                    accrual_salary = BonusLedger(
                        user_id=target_medrep_id,
                        amount=payment_salary_total,
                        ledger_type=LedgerType.ACCRUAL,
                        ledger_category="salary",
                        payment_id=p.id,
                        target_month=now.month,
                        target_year=now.year,
                        notes=f"Зарплата начислена по счет-фактуре #{inv.id} (Аптека: {res.med_org.name if res.med_org else 'N/A'})"
                    )
                    db.add(accrual_salary)

                added_bonuses += 1

        if added_bonuses > 0:
            await db.commit()
            print(f"\nJami {added_bonuses} ta payment uchun bonuslar bazaga muvaffaqiyatli qo'shildi.")
        else:
            print("\nHech qanday o'zgartirish kiritilmadi (Hamma bonuslar oldindan mavjud).")

if __name__ == "__main__":
    asyncio.run(main())
