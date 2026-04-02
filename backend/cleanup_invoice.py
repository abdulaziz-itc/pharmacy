"""
Cleanup script: Delete Invoice #12 and ALL related records.
Run from backend directory:  python3 cleanup_invoice.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from sqlalchemy import text


FACTURA_NUMBER = "12"


async def cleanup():
    async with AsyncSessionLocal() as db:
        # 1. Find Invoice
        r = await db.execute(text(
            "SELECT id, reservation_id, total_amount, paid_amount, promo_balance "
            "FROM invoice WHERE factura_number = :fn"
        ), {"fn": FACTURA_NUMBER})
        invoice = r.fetchone()

        if not invoice:
            print(f"Invoice '{FACTURA_NUMBER}' not found. Nothing to delete.")
            return

        inv_id = invoice[0]
        res_id = invoice[1]
        print(f"Found Invoice ID={inv_id}, Reservation ID={res_id}, Total={invoice[2]}, Paid={invoice[3]}")

        # 2. Get ReservationItem IDs
        r = await db.execute(text(
            "SELECT id FROM reservationitem WHERE reservation_id = :rid"
        ), {"rid": res_id})
        item_ids = [row[0] for row in r.fetchall()]
        print(f"ReservationItem IDs: {item_ids}")

        # 3. Get Payment IDs
        r = await db.execute(text(
            "SELECT id FROM payment WHERE invoice_id = :iid"
        ), {"iid": inv_id})
        payment_ids = [row[0] for row in r.fetchall()]
        print(f"Payment IDs: {payment_ids}")

        # ---- DELETE in correct order ----

        # 4. Delete BonusLedger entries linked to reservation items
        if item_ids:
            r = await db.execute(text(
                "DELETE FROM bonus_ledger WHERE invoice_item_id = ANY(:ids)"
            ), {"ids": item_ids})
            print(f"Deleted {r.rowcount} bonus_ledger entries (from items)")

        # 5. Delete BonusLedger entries linked to payments
        if payment_ids:
            r = await db.execute(text(
                "DELETE FROM bonus_ledger WHERE payment_id = ANY(:ids)"
            ), {"ids": payment_ids})
            print(f"Deleted {r.rowcount} bonus_ledger entries (from payments)")

        # 6. Delete UnassignedSale
        r = await db.execute(text(
            "DELETE FROM unassigned_sale WHERE invoice_id = :iid"
        ), {"iid": inv_id})
        print(f"Deleted {r.rowcount} unassigned_sale entries")

        # 7. Delete Payments
        r = await db.execute(text(
            "DELETE FROM payment WHERE invoice_id = :iid"
        ), {"iid": inv_id})
        print(f"Deleted {r.rowcount} payments")

        # 8. Delete Invoice
        r = await db.execute(text(
            "DELETE FROM invoice WHERE id = :iid"
        ), {"iid": inv_id})
        print(f"Deleted {r.rowcount} invoice")

        # 9. Delete ReservationItems
        if item_ids:
            r = await db.execute(text(
                "DELETE FROM reservationitem WHERE id = ANY(:ids)"
            ), {"ids": item_ids})
            print(f"Deleted {r.rowcount} reservation items")

        # 10. Delete Reservation
        r = await db.execute(text(
            "DELETE FROM reservation WHERE id = :rid"
        ), {"rid": res_id})
        print(f"Deleted {r.rowcount} reservation")

        # 11. Reset DoctorMonthlyStat for April 2026 (the invoice date)
        #     Set sold_quantity, paid_quantity, paid_amount, bonus_amount to 0
        #     for stats that were incremented by this invoice
        r = await db.execute(text(
            "UPDATE doctor_monthly_stat SET sold_quantity = 0, paid_quantity = 0, "
            "paid_amount = 0, bonus_amount = 0 "
            "WHERE month = 4 AND year = 2026"
        ))
        print(f"Reset {r.rowcount} doctor_monthly_stat rows for April 2026")

        await db.commit()
        print("\n✅ Cleanup complete! Invoice #12 and all related data deleted.")


if __name__ == "__main__":
    asyncio.run(cleanup())
