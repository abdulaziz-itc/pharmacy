import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.ledger import BonusLedger
from app.models.user import User
from app.models.audit import AuditLog
from sqlalchemy import select
from datetime import timedelta

async def main():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.id == 18))
        medrep = user_res.scalars().first()
        
        # 16 apreldagi to'lov
        op_res = await db.execute(
            select(BonusLedger)
            .where(BonusLedger.user_id == medrep.id)
            .where(BonusLedger.amount == 82809)
        )
        op = op_res.scalars().first()
        
        if op:
            print(f"Advance entry: id={op.id}, created_at={op.created_at}, category={op.ledger_category}")
            
            # Audit log
            start_time = op.created_at - timedelta(minutes=1)
            end_time = op.created_at + timedelta(minutes=1)
            audit_res = await db.execute(
                select(AuditLog)
                .where(AuditLog.entity_id == medrep.id)
                .where(AuditLog.action == "UPDATE")
                .where(AuditLog.description.ilike('%Выплачен%'))
                .where(AuditLog.created_at.between(start_time, end_time))
            )
            audit = audit_res.scalars().first()
            if audit:
                print(f"Audit log at that time: {audit.description}")
            else:
                print("No audit log found at that time!")

            # Unpaid accruals just before the payment
            acc_res = await db.execute(
                select(BonusLedger)
                .where(BonusLedger.user_id == medrep.id)
                .where(BonusLedger.ledger_type == "accrual")
                .where(BonusLedger.created_at <= op.created_at)
            )
            all_accruals = acc_res.scalars().all()
            
            total_accrued = 0
            paid_accruals = 0
            unpaid_accruals = 0
            unpaid_bonus = 0
            unpaid_salary = 0
            
            for a in all_accruals:
                total_accrued += a.amount
                if a.is_paid:
                    paid_accruals += a.amount
                else:
                    unpaid_accruals += a.amount
                    if a.ledger_category == 'bonus':
                        unpaid_bonus += a.amount
                    elif a.ledger_category == 'salary':
                        unpaid_salary += a.amount
                        
            print(f"Total accrued before payment: {total_accrued}")
            print(f"Of which, marked as is_paid=True: {paid_accruals}")
            print(f"Unpaid accruals (is_paid=False) just before payment: {unpaid_accruals}")
            print(f"Unpaid bonus category: {unpaid_bonus}")
            print(f"Unpaid salary category: {unpaid_salary}")

if __name__ == "__main__":
    asyncio.run(main())
