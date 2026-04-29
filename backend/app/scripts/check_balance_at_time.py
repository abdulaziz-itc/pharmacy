import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import BonusLedger
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.full_name.ilike('%Шерматов Ойбек%')))
        medrep = user_res.scalars().first()
        
        # 16 apreldagi to'lov vaqtidagi holat
        op_res = await db.execute(
            select(BonusLedger)
            .where(BonusLedger.user_id == medrep.id)
            .where(BonusLedger.amount == 82809)
        )
        op = op_res.scalars().first()
        
        if op:
            print(f"To'lov vaqti: {op.created_at}")
            # Shu vaqtgacha bo'lgan jami accrual
            acc_res = await db.execute(
                select(BonusLedger)
                .where(BonusLedger.user_id == medrep.id)
                .where(BonusLedger.ledger_type == "accrual")
                .where(BonusLedger.created_at < op.created_at)
            )
            accruals = acc_res.scalars().all()
            total_accrued = sum(a.amount for a in accruals)
            
            # Shu vaqtgacha bo'lgan jami to'lov
            pay_res = await db.execute(
                select(BonusLedger)
                .where(BonusLedger.user_id == medrep.id)
                .where(BonusLedger.ledger_type.in_(["advance", "payout"]))
                .where(BonusLedger.created_at < op.created_at)
            )
            payments = pay_res.scalars().all()
            total_paid = sum(p.amount for p in payments)
            
            print(f"O'sha vaqtgacha hisoblangan jami bonus: {total_accrued:,.0f}")
            print(f"O'sha vaqtgacha qilingan jami to'lov (oldingi to'lovlar): {total_paid:,.0f}")
            print(f"O'sha vaqtda Medrepdagi HAQIQIY qoldiq (Total Accrued - Total Paid): {total_accrued - total_paid:,.0f}")
            print("Agar bu qoldiq manfiy bo'lsa yoki to'langan summa bu qoldiqdan katta bo'lsa, avans yozilishi to'g'ri.")
            
if __name__ == "__main__":
    asyncio.run(main())
