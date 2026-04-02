"""
Full cleanup: Delete ALL bonus_ledger entries, payouts, advances, 
doctor allocations, and unassigned_sales for the system.
Run from backend directory:  python3 cleanup_invoice.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from sqlalchemy import text


async def full_cleanup():
    async with AsyncSessionLocal() as db:
        # 1. Delete ALL bonus_ledger entries
        r = await db.execute(text("DELETE FROM bonus_ledger"))
        print(f"Deleted {r.rowcount} bonus_ledger entries")

        # 2. Delete ALL unassigned_sale entries
        r = await db.execute(text("DELETE FROM unassigned_sale"))
        print(f"Deleted {r.rowcount} unassigned_sale entries")

        # 3. Delete ALL doctor_fact_assignment entries
        r = await db.execute(text("DELETE FROM doctor_fact_assignment"))
        print(f"Deleted {r.rowcount} doctor_fact_assignment entries")

        # 4. Delete ALL bonus_payment entries
        r = await db.execute(text("DELETE FROM bonus_payment"))
        print(f"Deleted {r.rowcount} bonus_payment entries")

        # 5. Reset ALL doctor_monthly_stat to zero
        r = await db.execute(text(
            "UPDATE doctor_monthly_stat SET sold_quantity = 0, paid_quantity = 0, "
            "paid_amount = 0, bonus_amount = 0"
        ))
        print(f"Reset {r.rowcount} doctor_monthly_stat rows")

        # 6. Delete ALL payments
        r = await db.execute(text("DELETE FROM payment"))
        print(f"Deleted {r.rowcount} payments")

        # 7. Delete ALL invoices
        r = await db.execute(text("DELETE FROM invoice"))
        print(f"Deleted {r.rowcount} invoices")

        # 8. Delete ALL reservation items
        r = await db.execute(text("DELETE FROM reservationitem"))
        print(f"Deleted {r.rowcount} reservation items")

        # 9. Delete ALL reservations
        r = await db.execute(text("DELETE FROM reservation"))
        print(f"Deleted {r.rowcount} reservations")

        await db.commit()
        print("\n✅ Full cleanup complete! All invoices, bonuses, and related data deleted.")


if __name__ == "__main__":
    confirm = input("⚠️  This will delete ALL invoices, reservations, bonuses, and payments. Type 'YES' to confirm: ")
    if confirm == "YES":
        asyncio.run(full_cleanup())
    else:
        print("Cancelled.")
