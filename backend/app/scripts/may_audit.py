import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import asyncio
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, ReservationItem, Payment
from app.models.product import Product
from datetime import datetime

async def audit():
    async with AsyncSessionLocal() as db:
        # May 2026 fakturalarini olish
        query = (
            select(Invoice)
            .options(
                selectinload(Invoice.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product),
                selectinload(Invoice.reservation).selectinload(Reservation.created_by),
                selectinload(Invoice.reservation).selectinload(Reservation.med_org),
                selectinload(Invoice.payments),
            )
            .join(Reservation, Invoice.reservation_id == Reservation.id)
            .where(
                Invoice.status != "cancelled",
                Invoice.date >= datetime(2026, 5, 1),
                Invoice.date < datetime(2026, 6, 1),
            )
            .order_by(Invoice.id)
        )
        result = await db.execute(query)
        invoices = result.scalars().all()

        # Umumiy jamlar
        total_invoice_sum = 0.0
        total_paid = 0.0
        total_debt = 0.0
        total_bonus = 0.0
        total_salary = 0.0
        total_cost = 0.0
        total_gross_profit = 0.0

        SEP = "=" * 160
        LINE = "-" * 160

        print(SEP)
        print(f"  MAY 2026 — BARCHA FAKTURALAR AUDITIT (Qo'lda hisob-kitob vs Dastur)")
        print(SEP)
        print(f"\n{'#':<4} {'Fakt.#':<8} {'Kontragent':<22} {'Fakt.Summa':>14} {'To\'langan':>13} {'Qarzdorlik':>13} {'Bonus':>13} {'Oylik':>11} {'Tan narx':>11} {'Sof Foyda':>13}")
        print(LINE)

        for i, inv in enumerate(invoices, 1):
            res = inv.reservation
            if not res:
                continue

            # Manual hisob-kitob
            items = res.items or []
            manual_invoice_total = inv.total_amount or 0
            manual_paid = inv.paid_amount or 0
            manual_debt = max(0, manual_invoice_total - manual_paid)

            # Har bir tovar bo'yicha hisob
            item_bonus_total = 0.0
            item_salary_total = 0.0
            item_cost_total = 0.0
            item_revenue_total = 0.0

            item_lines = []
            for item in items:
                p = item.product
                qty = item.quantity or 0
                unit_price = item.price or 0
                discount = item.discount_percent or 0
                sell_price = unit_price * (1 - discount / 100.0)

                # Bonus: fakturadagi qiymat (is_bonus_eligible tekshiruvi)
                if res.is_bonus_eligible:
                    bonus_per_unit = item.marketing_amount if (item.marketing_amount and item.marketing_amount > 0) else (p.marketing_expense or 0 if p else 0)
                else:
                    bonus_per_unit = 0.0

                # Oylik: fakturadagi qiymat (is_salary_enabled tekshiruvi)
                if res.is_salary_enabled:
                    salary_per_unit = item.salary_amount if (item.salary_amount and item.salary_amount > 0) else (p.salary_expense or 0 if p else 0)
                else:
                    salary_per_unit = 0.0

                cost_per_unit = p.production_price or 0 if p else 0
                other_per_unit = p.other_expenses or 0 if p else 0

                line_revenue = sell_price * qty
                line_bonus = bonus_per_unit * qty
                line_salary = salary_per_unit * qty
                line_cost = cost_per_unit * qty
                line_other = other_per_unit * qty
                line_total_expense = line_cost + line_bonus + line_salary + line_other
                line_profit = line_revenue - line_total_expense

                item_revenue_total += line_revenue
                item_bonus_total += line_bonus
                item_salary_total += line_salary
                item_cost_total += line_cost

                item_lines.append({
                    "name": p.name[:25] if p else "?",
                    "qty": qty,
                    "price": unit_price,
                    "sell": sell_price,
                    "bonus": bonus_per_unit,
                    "salary": salary_per_unit,
                    "cost": cost_per_unit,
                    "line_revenue": line_revenue,
                    "line_bonus": line_bonus,
                    "line_salary": line_salary,
                    "line_cost": line_cost,
                    "line_profit": line_profit,
                })

            gross_profit = item_revenue_total - item_cost_total - item_bonus_total - item_salary_total

            # Kontragent
            customer = (res.med_org.name[:20] if res.med_org else None) or res.customer_name[:20] if res.customer_name else "—"
            factura_no = inv.factura_number or str(inv.id)

            print(f"{i:<4} {factura_no:<8} {customer:<22} {manual_invoice_total:>14,.0f} {manual_paid:>13,.0f} {manual_debt:>13,.0f} {item_bonus_total:>13,.0f} {item_salary_total:>11,.0f} {item_cost_total:>11,.0f} {gross_profit:>13,.0f}")

            # Har bir tovar detali
            for il in item_lines:
                profit_flag = "✅" if il['line_profit'] >= 0 else "🔴"
                print(f"     └─ {il['name']:<27} x{il['qty']:<4} Narx:{il['price']:>10,.0f} | Bonus:{il['bonus']:>8,.0f} | Oylik:{il['salary']:>8,.0f} | TanNarx:{il['cost']:>8,.0f} | Foyda:{il['line_profit']:>10,.0f} {profit_flag}")

            print()

            # Umumiy jamga qo'shish
            total_invoice_sum += manual_invoice_total
            total_paid += manual_paid
            total_debt += manual_debt
            total_bonus += item_bonus_total
            total_salary += item_salary_total
            total_cost += item_cost_total
            total_gross_profit += gross_profit

        print(SEP)
        print(f"  JAMI (MAY 2026):")
        print(f"  Fakturalar soni       : {len(invoices)} ta")
        print(f"  Jami faktura summasi  : {total_invoice_sum:>20,.2f} so'm")
        print(f"  Jami to'langan (paid) : {total_paid:>20,.2f} so'm")
        print(f"  Jami qarzdorlik       : {total_debt:>20,.2f} so'm")
        print(f"  Jami Bonus (Promo)    : {total_bonus:>20,.2f} so'm")
        print(f"  Jami Oylik (Zarplata) : {total_salary:>20,.2f} so'm")
        print(f"  Jami Tan narx (Cost)  : {total_cost:>20,.2f} so'm")
        print(f"  ─────────────────────────────────────────")
        print(f"  Valovaya Pribil (GP)  : {total_gross_profit:>20,.2f} so'm  ← Dastur bilan solishtiring!")
        print(SEP)

if __name__ == "__main__":
    asyncio.run(audit())
