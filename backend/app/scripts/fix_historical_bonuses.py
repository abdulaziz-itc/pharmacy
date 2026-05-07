import asyncio
from sqlalchemy import select, delete
from app.db.session import AsyncSessionLocal
from app.models.ledger import BonusLedger, LedgerType
from app.models.sales import Payment, Invoice, Reservation, DoctorFactAssignment, UnassignedSale

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Fix Salary Accruals
        stmt_salary = select(BonusLedger, Reservation).join(
            Payment, BonusLedger.payment_id == Payment.id
        ).join(
            Invoice, Payment.invoice_id == Invoice.id
        ).join(
            Reservation, Invoice.reservation_id == Reservation.id
        ).where(
            BonusLedger.ledger_type == LedgerType.ACCRUAL,
            BonusLedger.ledger_category == 'salary',
            Reservation.is_salary_enabled == False
        )
        
        res_salary = await db.execute(stmt_salary)
        wrong_salaries = res_salary.all()
        print(f"Found {len(wrong_salaries)} incorrect salary accruals.")
        for ledger, res in wrong_salaries:
            print(f"  Deleting Salary BonusLedger ID {ledger.id} (Amount: {ledger.amount}, Res: {res.id})")
            await db.delete(ledger)

        # 2. Fix Bonus Accruals from direct Payments
        stmt_bonus_pmt = select(BonusLedger, Reservation).join(
            Payment, BonusLedger.payment_id == Payment.id
        ).join(
            Invoice, Payment.invoice_id == Invoice.id
        ).join(
            Reservation, Invoice.reservation_id == Reservation.id
        ).where(
            BonusLedger.ledger_type == LedgerType.ACCRUAL,
            BonusLedger.ledger_category == 'bonus',
            Reservation.is_bonus_eligible == False
        )
        
        res_bonus_pmt = await db.execute(stmt_bonus_pmt)
        wrong_bonuses_pmt = res_bonus_pmt.all()
        print(f"Found {len(wrong_bonuses_pmt)} incorrect bonus accruals from payments.")
        for ledger, res in wrong_bonuses_pmt:
            print(f"  Deleting Bonus BonusLedger ID {ledger.id} (Amount: {ledger.amount}, Res: {res.id})")
            await db.delete(ledger)
            
        # Check BonusLedger from facts using "Бонус распределен из счет-фактуры" note pattern
        stmt_fact_bonus = select(BonusLedger).where(
            BonusLedger.ledger_type == LedgerType.ACCRUAL,
            BonusLedger.fact_id.isnot(None),
            BonusLedger.notes.like("%Бонус распределен из счет-фактуры #%")
        )
        res_fact_bonus = await db.execute(stmt_fact_bonus)
        fact_bonuses = res_fact_bonus.scalars().all()
        fact_deleted_count = 0
        for b in fact_bonuses:
            # parse invoice id from note
            import re
            m = re.search(r"счет-фактуры #(\d+)", b.notes)
            if m:
                inv_id = int(m.group(1))
                inv_q = select(Invoice).where(Invoice.id == inv_id)
                inv_res = await db.execute(inv_q)
                inv = inv_res.scalar_one_or_none()
                if inv:
                    res_q = select(Reservation).where(Reservation.id == inv.reservation_id)
                    res_res = await db.execute(res_q)
                    r = res_res.scalar_one_or_none()
                    if r and r.is_bonus_eligible == False:
                        print(f"  Deleting Fact BonusLedger ID {b.id} (Amount: {b.amount}, Inv: {inv.id}, Res: {r.id})")
                        await db.delete(b)
                        fact_deleted_count += 1
                        
        print(f"Found and deleted {fact_deleted_count} incorrect fact-based bonus accruals.")

        await db.commit()
        print("Done fixing historical data.")

if __name__ == "__main__":
    asyncio.run(main())
