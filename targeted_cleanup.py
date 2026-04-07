import asyncio
from sqlalchemy import select, delete, text, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import sys

# --- CONFIGURATION ---
# Users must provide their DATABASE_URL when running the script
# Example: postgresql+asyncpg://user:pass@localhost/dbname
DATABASE_URL = input("Enter DATABASE_URL (e.g., postgresql+asyncpg://user:pass@localhost/dbname): ").strip()
TARGET_FACTURAS = ['4324', '121']

async def targeted_cleanup():
    if not DATABASE_URL:
        print("❌ DATABASE_URL is required.")
        return

    try:
        engine = create_async_engine(DATABASE_URL, echo=False)
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    except Exception as e:
        print(f"❌ Failed to create engine: {e}")
        return

    async with AsyncSessionLocal() as db:
        print(f"\n🔍 Searching for invoices: {TARGET_FACTURAS}...")
        
        # 1. Get Invoices
        raw_invoices = await db.execute(text("SELECT id, factura_number, reservation_id, date FROM invoice WHERE factura_number IN :nums"), {"nums": tuple(TARGET_FACTURAS)})
        invoices = raw_invoices.all()
        
        if not invoices:
            print("❌ No invoices found with these numbers.")
            return

        inv_ids = [inv.id for inv in invoices]
        res_ids = [inv.reservation_id for inv in invoices if inv.reservation_id]
        
        print(f"✅ Found {len(invoices)} invoices: IDs {inv_ids}")
        print(f"📦 Associated Reservation IDs: {res_ids}")

        # 2. Identify Payments
        raw_payments = await db.execute(text("SELECT id, amount FROM payment WHERE invoice_id IN :ids"), {"ids": tuple(inv_ids)})
        payments = raw_payments.all()
        pay_ids = [p.id for p in payments]
        print(f"💸 Found {len(payments)} payments to be deleted.")

        # 3. Identify Reservation Items
        raw_items = await db.execute(text("SELECT id, product_id, quantity, price, total_price, marketing_amount, salary_amount FROM reservationitem WHERE reservation_id IN :ids"), {"ids": tuple(res_ids)})
        items = raw_items.all()
        item_ids = [i.id for i in items]
        print(f"📋 Found {len(items)} reservation items to be deleted.")

        # 4. Identify Bonus Ledger entries
        # These can be linked to items (accrual) or payments (payouts/offsets)
        raw_ledger = await db.execute(text("SELECT id, amount, ledger_type FROM bonus_ledger WHERE invoice_item_id IN :item_ids OR payment_id IN :pay_ids"), 
                                     {"item_ids": tuple(item_ids + [-1]), "pay_ids": tuple(pay_ids + [-1])})
        ledger_entries = raw_ledger.all()
        ledger_ids = [l.id for l in ledger_entries]
        print(f"📊 Found {len(ledger_entries)} bonus ledger records to be deleted.")

        # 5. Identify DoctorFactAssignments
        # These are linked via fact_id in BonusLedger or created for these invoices
        fact_ids_from_ledger = [l.fact_id for l in ledger_entries if hasattr(l, 'fact_id') and l.fact_id]
        
        # Also find facts by MedRep/Doctor/Product/Month from items
        # (This is more comprehensive if they weren't directly linked)
        fact_ids = set(fact_ids_from_ledger)
        for inv in invoices:
            month, year = inv.date.month, inv.date.year
            # Get reservation and items to find created_by_id, doctor_id, and products
            res_info = await db.execute(text("SELECT created_by_id, doctor_id FROM reservation WHERE id = :rid"), {"rid": inv.reservation_id})
            res_row = res_info.first()
            if res_row:
                # Find facts for this month/year/doctor/med_rep
                raw_facts = await db.execute(text("SELECT id FROM doctor_fact_assignment WHERE month = :m AND year = :y AND (doctor_id = :did OR med_rep_id = :mid)"), 
                                            {"m": month, "y": year, "did": res_row.doctor_id, "mid": res_row.created_by_id})
                for f in raw_facts:
                    fact_ids.add(f.id)
        
        fact_ids = list(fact_ids)
        print(f"👨‍⚕️ Found {len(fact_ids)} doctor fact assignments to be deleted.")

        # 6. Identify BonusPayments
        raw_bonus_pay = await db.execute(text("SELECT id FROM bonus_payment WHERE id IN (SELECT id FROM bonus_payment WHERE notes LIKE :pat1 OR notes LIKE :pat2)"), 
                                        {"pat1": f"%#{inv_ids[0]}%", "pat2": f"%#{inv_ids[1]}%" if len(inv_ids) > 1 else "%#UNKNOWN%"})
        bonus_pay_entries = raw_bonus_pay.all()
        bonus_pay_ids = [bp.id for bp in bonus_pay_entries]
        print(f"💳 Found {len(bonus_pay_ids)} bonus payment records to be deleted.")

        # 7. Identify Unassigned Sales
        raw_unassigned = await db.execute(text("SELECT id FROM unassigned_sale WHERE invoice_id IN :ids"), {"ids": tuple(inv_ids)})
        unassigned_entries = raw_unassigned.all()
        unassigned_ids = [u.id for u in unassigned_entries]
        print(f"📦 Found {len(unassigned_entries)} unassigned sales records to be deleted.")

        # SUMMARY & CONFIRMATION
        print("\n" + "!"*40)
        print("⚠️  WARNING: PERMANENT DELETION SUMMARY")
        print(f"Total Invoices: {len(invoices)}")
        print(f"Total Reservations: {len(res_ids)}")
        print(f"Total Payments: {len(payments)}")
        print(f"Total Items: {len(items)}")
        print(f"Total Bonus Records (Ledger): {len(ledger_ids)}")
        print(f"Total Doctor Assignments: {len(fact_ids)}")
        print(f"Total Bonus Payout Records: {len(bonus_pay_ids)}")
        print("!"*40)
        
        confirm = input("\nType 'YES' to confirm deletion and update monthly stats: ")
        if confirm != "YES":
            print("❌ Operation cancelled.")
            return

        print("\n🚀 Executing deletion...")

        # 8. Update Doctor Monthly Stats before deleting items
        for inv in invoices:
            month, year = inv.date.month, inv.date.year
            res_data = await db.execute(text("SELECT id, doctor_id FROM reservation WHERE id = :rid"), {"rid": inv.reservation_id})
            res_row = res_data.first()
            if not res_row: continue
            
            doc_id = res_row.doctor_id
            
            # Substract quantities and bonuses
            res_items = await db.execute(text("SELECT product_id, quantity, total_price, marketing_amount FROM reservationitem WHERE reservation_id = :rid"), {"rid": inv.reservation_id})
            for item in res_items:
                bonus_to_subtract = float(round(item.quantity * (item.marketing_amount or 0)))
                
                await db.execute(text("""
                    UPDATE doctor_monthly_stat 
                    SET sold_quantity = GREATEST(0, sold_quantity - :qty),
                        paid_quantity = GREATEST(0, paid_quantity - :qty),
                        paid_amount = GREATEST(0, paid_amount - :total),
                        bonus_amount = GREATEST(0, bonus_amount - :bonus),
                        updated_at = NOW()
                    WHERE product_id = :pid AND month = :m AND year = :y 
                    AND (doctor_id = :did OR doctor_id IS NULL)
                """), {"qty": item.quantity, "total": item.total_price, "bonus": bonus_to_subtract, "pid": item.product_id, "m": month, "y": year, "did": doc_id})
        
        print("📉 Doctor monthly stats adjusted.")

        # 9. Perform Deletions
        try:
            if bonus_pay_ids:
                await db.execute(text("DELETE FROM bonus_payment WHERE id IN :ids"), {"ids": tuple(bonus_pay_ids)})

            if ledger_ids:
                await db.execute(text("DELETE FROM bonus_ledger WHERE id IN :ids"), {"ids": tuple(ledger_ids)})
            
            if fact_ids:
                await db.execute(text("DELETE FROM doctor_fact_assignment WHERE id IN :ids"), {"ids": tuple(fact_ids)})

            if unassigned_ids:
                await db.execute(text("DELETE FROM unassigned_sale WHERE id IN :ids"), {"ids": tuple(unassigned_ids)})
            
            if pay_ids:
                await db.execute(text("DELETE FROM payment WHERE id IN :ids"), {"ids": tuple(pay_ids)})
            
            if item_ids:
                await db.execute(text("DELETE FROM reservationitem WHERE id IN :ids"), {"ids": tuple(item_ids)})
            
            if inv_ids:
                await db.execute(text("DELETE FROM invoice WHERE id IN :ids"), {"ids": tuple(inv_ids)})
            
            if res_ids:
                await db.execute(text("DELETE FROM reservation WHERE id IN :ids"), {"ids": tuple(res_ids)})

            await db.commit()
            print("\n✅ SUCCESS: All selected records have been deleted.")
            
        except Exception as delete_error:
            await db.rollback()
            print(f"❌ ERROR during deletion: {delete_error}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(targeted_cleanup())
