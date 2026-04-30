"""
invoice_id = NULL bo'lgan 8 ta payment qaysi tashkilotga tegishli ekanini ko'rsatadi.
"""
import asyncio, os, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment
from app.models.crm import BalanceTransaction, MedicalOrganization
from sqlalchemy import select, func, and_
from datetime import timedelta

async def main():
    async with AsyncSessionLocal() as db:
        payments = (await db.execute(
            select(Payment).where(Payment.invoice_id.is_(None)).order_by(Payment.id)
        )).scalars().all()

        print(f"invoice_id = NULL bo'lgan {len(payments)} ta payment:\n")
        for p in payments:
            # source_payment_id orqali izlaymiz
            source_info = ""
            if p.source_payment_id:
                source_info = f"source_payment_id={p.source_payment_id}"

            # Vaqt oralig'ida BT dan org topamiz (±5 soniya)
            dt = p.date
            nearby_bts = (await db.execute(
                select(BalanceTransaction)
                .where(and_(
                    BalanceTransaction.created_at >= dt - timedelta(minutes=5),
                    BalanceTransaction.created_at <= dt + timedelta(minutes=5),
                ))
                .order_by(func.abs(func.extract('epoch', BalanceTransaction.created_at - dt)))
                .limit(3)
            )).scalars().all()

            org_names = []
            for bt in nearby_bts:
                org = (await db.execute(
                    select(MedicalOrganization).where(MedicalOrganization.id == bt.organization_id)
                )).scalar_one_or_none()
                if org and org.name not in org_names:
                    org_names.append(f"{org.name} (BT#{bt.id} {bt.transaction_type} {bt.amount:,.0f})")

            print(f"  #{p.id} | {p.amount:>14,.2f} UZS | {str(p.date)[:10]}")
            print(f"    comment: '{p.comment}'")
            if org_names:
                print(f"    Ehtimoliy tashkilot: {', '.join(org_names)}")
            else:
                print(f"    Tashkilot topilmadi (BT o'chirilgan)")
            if source_info:
                print(f"    {source_info}")
            print()

if __name__ == "__main__":
    asyncio.run(main())
