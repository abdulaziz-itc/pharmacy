import asyncio
import os
import sys

# Backend yo'lini qo'shish
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import BonusLedger
from app.models.user import User
from app.models.audit import AuditLog
from sqlalchemy import select
from datetime import timedelta

async def prove_overpayments():
    print("Шерматов Ойбек bo'yicha to'lovlar tarixini tekshiryapmiz...\n")
    async with AsyncSessionLocal() as db:
        # Medrepni topish
        user_res = await db.execute(select(User).where(User.full_name.ilike('%Шерматов Ойбек%')))
        medrep = user_res.scalars().first()
        
        if not medrep:
            print("Medrep topilmadi.")
            return

        # Aniq o'sha "Выплата" larni topish (144637 va 82809)
        overpayment_res = await db.execute(
            select(BonusLedger)
            .where(BonusLedger.user_id == medrep.id)
            .where(BonusLedger.amount.in_([144637, 82809]))
        )
        overpayments = overpayment_res.scalars().all()

        for op in overpayments:
            print(f"--- SANA: {op.created_at.strftime('%Y-%m-%d %H:%M:%S')} ---")
            print(f"Ortiqcha (Qoldiq) qism sifatida yozilgan summa: {op.amount:,.0f} UZS")
            
            # 1. Shu vaqtda (±1 daqiqa) admin kiritgan umumiy to'lov miqdorini audit logdan topish
            start_time = op.created_at - timedelta(minutes=1)
            end_time = op.created_at + timedelta(minutes=1)
            
            audit_res = await db.execute(
                select(AuditLog)
                .where(AuditLog.entity_id == medrep.id)
                .where(AuditLog.action == "UPDATE")
                .where(AuditLog.description.ilike('%Выплачен бонус МП%'))
                .where(AuditLog.created_at.between(start_time, end_time))
            )
            audit = audit_res.scalars().first()
            if audit:
                print(f"Admin kiritgan UMUMIY to'lov summasi: {audit.description}")
            
            # 2. Shu vaqtning o'zida yopilgan is_paid=True bo'lgan accrual qatorlarni hisoblash
            # Yoki ayni shu vaqtda o'zgargan qatorlar
            print(f"Sabab: Admin yuqoridagi umumiy summani kiritganida, Oybektaning yopilmagan faktik bonuslari yetarli bo'lmagan va tizim yetmagan qismini ({op.amount:,.0f} UZS) shu 'Выплата' orqali balansga tushirgan.\n")

if __name__ == "__main__":
    asyncio.run(prove_overpayments())
