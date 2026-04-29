import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.audit import AuditLog
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.full_name.ilike('%Райхан%')))
        medrep = user_res.scalars().first()
        
        audit_res = await db.execute(
            select(AuditLog)
            .where(AuditLog.entity_id == medrep.id)
            .where(AuditLog.description.ilike('%Выплачен%'))
            .order_by(AuditLog.created_at.asc())
        )
        audits = audit_res.scalars().all()
        
        print("Audit Logs for Raihan (Выплаты):")
        for a in audits:
            print(f"{a.created_at.strftime('%Y-%m-%d %H:%M:%S')} | {a.description}")

if __name__ == "__main__":
    asyncio.run(main())
