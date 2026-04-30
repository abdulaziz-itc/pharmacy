"""
Dashboarddagi "Fakt Postupleniy" (2,944,648,860) tarkibini tahlil qiladi.
"""
import asyncio, os, sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.models.sales import Payment, Invoice
from app.models.crm import BalanceTransaction
from sqlalchemy import select, func, or_, and_, text

# Dashboard qaysi davr uchun ko'rsatyapti? (Joriy oy yoki hammasi)
# Agar filter yo'q bo'lsa, hammasini ko'ramiz
START = None
END = None

async def main():
    async with AsyncSessionLocal() as db:

        # 1. Jami barcha Payment (Excel dagi kabi)
        all_pay = (await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0.0))
        )).scalar() or 0.0
        print(f"1. Barcha Payment yig'indisi (Excel):     {all_pay:>20,.2f}")

        # 2. APPLICATION tipidagi paymentlar (topupdan yaratilgan)
        app_payment_ids = select(BalanceTransaction.payment_id).where(
            BalanceTransaction.payment_id.isnot(None),
            func.lower(BalanceTransaction.transaction_type) == 'application'
        ).scalar_subquery()
        app_pay = (await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0.0))
            .where(Payment.id.in_(app_payment_ids))
        )).scalar() or 0.0
        print(f"2. Application paymentlar (topupdan):     {app_pay:>20,.2f}")

        # 3. To'g'ridan-to'g'ri tўlovlar (application emas)
        direct_pay = all_pay - app_pay
        print(f"3. To'g'ridan to'g'ri to'lovlar (1-2):   {direct_pay:>20,.2f}")

        # 4. Topup BalanceTransaction yig'indisi
        top_sum = (await db.execute(
            select(func.coalesce(func.sum(BalanceTransaction.amount), 0.0))
            .where(or_(
                func.lower(BalanceTransaction.transaction_type) == 'topup',
                func.lower(BalanceTransaction.transaction_type) == 'refill',
            ))
        )).scalar() or 0.0
        print(f"4. Topup BalanceTransactionlar:           {top_sum:>20,.2f}")

        # 5. Dashboard hozir = 1 + 4
        dashboard_now = all_pay + top_sum
        print(f"\n5. Dashboard HOZIR (1+4):                {dashboard_now:>20,.2f}")

        # 6. Agar 3+4 bo'lsa (application chiqarilganda)
        fixed = direct_pay + top_sum
        print(f"6. Tuzatilsa (3+4):                       {fixed:>20,.2f}")

        print(f"\nFarq (5-6 = application): {app_pay:>20,.2f}")
        print(f"\nNatija: Application paymentlar topup BT lar bilan tengmi?")
        print(f"  Topup BT:          {top_sum:,.2f}")
        print(f"  Application Pay:   {app_pay:,.2f}")
        print(f"  Farq:              {abs(top_sum - app_pay):,.2f}")

if __name__ == "__main__":
    asyncio.run(main())
