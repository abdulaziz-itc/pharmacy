"""
Скрипт для проверки начислений Акбар_МП:
- Находит MedRep по имени "Акбар"
- Проверяет, есть ли начисления (BonusLedger) от бронирований с is_bonus_eligible=False
- Выводит итоговую статистику
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import select, func, and_
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.ledger import BonusLedger, LedgerType
from app.models.sales import Reservation, Invoice


async def main():
    async with AsyncSessionLocal() as db:
        # 1. Find all med reps (show all to pick Akbar)
        q = select(User).where(User.role == UserRole.MED_REP)
        reps = (await db.execute(q)).scalars().all()

        print("=" * 70)
        print("Barcha Med Rep lar:")
        print("=" * 70)
        akbar = None
        for r in reps:
            print(f"  ID: {r.id} | {r.full_name} | {r.username}")
            if "акбар" in (r.full_name or "").lower() or "akbar" in (r.username or "").lower():
                akbar = r

        if not akbar:
            print("\n[!] 'Акбар' ismli MedRep topilmadi. Barcha IDlarni ko'ring va qo'lda ID kiriting.")
            return

        print(f"\n[✓] Topildi: {akbar.full_name} (ID={akbar.id})")
        print("=" * 70)

        # 2. Total accruals for this rep
        all_accruals_q = select(BonusLedger).where(
            BonusLedger.user_id == akbar.id,
            BonusLedger.ledger_type == LedgerType.ACCRUAL,
            BonusLedger.ledger_category == "bonus"
        )
        all_entries = (await db.execute(all_accruals_q)).scalars().all()
        total_accrued = sum(e.amount for e in all_entries)
        print(f"Jami hisoblangan bonus (BonusLedger ACCRUAL): {total_accrued:,.2f} UZS")
        print(f"Jami yozuv soni: {len(all_entries)}")

        # 3. Find accruals linked to reservations with is_bonus_eligible=False
        bad_entries = []
        for entry in all_entries:
            if entry.invoice_id:
                inv_q = select(Invoice).where(Invoice.id == entry.invoice_id)
                inv = (await db.execute(inv_q)).scalar_one_or_none()
                if inv and inv.reservation_id:
                    res_q = select(Reservation).where(Reservation.id == inv.reservation_id)
                    res = (await db.execute(res_q)).scalar_one_or_none()
                    if res and not res.is_bonus_eligible:
                        bad_entries.append((entry, inv, res))

        print("\n" + "=" * 70)
        print(f"NOTO'G'RI yozuvlar (is_bonus_eligible=False bo'lgan bronlardan):")
        print("=" * 70)

        if not bad_entries:
            print("  [✓] Hech qanday noto'g'ri yozuv topilmadi! Barcha bonuslar to'g'ri.")
        else:
            bad_total = sum(e[0].amount for e in bad_entries)
            print(f"  [!] Topildi: {len(bad_entries)} ta yozuv | Jami: {bad_total:,.2f} UZS")
            for entry, inv, res in bad_entries:
                print(f"    - BonusLedger ID={entry.id} | Invoice={inv.id} | "
                      f"Res={res.id} (bonus={res.is_bonus_eligible}) | "
                      f"Summa={entry.amount:,.2f} UZS")
            print(f"\n  => Tozalash kerak bo'lgan summa: {bad_total:,.2f} UZS")

        # 4. Summary
        print("\n" + "=" * 70)
        payout_q = select(func.coalesce(func.sum(BonusLedger.amount), 0.0)).where(
            BonusLedger.user_id == akbar.id,
            BonusLedger.ledger_type.in_([LedgerType.PAYOUT, LedgerType.ADVANCE, LedgerType.OFFSET]),
            BonusLedger.ledger_category == "bonus"
        )
        total_paid = float((await db.execute(payout_q)).scalar() or 0.0)
        remainder = max(0.0, total_accrued - total_paid)

        print(f"Jami hisoblangan : {total_accrued:,.2f} UZS")
        print(f"Jami to'langan   : {total_paid:,.2f} UZS")
        print(f"Qoldiq (to'lanmagan): {remainder:,.2f} UZS")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
