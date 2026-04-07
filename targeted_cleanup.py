
import asyncio
import logging
import argparse
from sqlalchemy import select, delete, text
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, ReservationItem, Payment, UnassignedSale
from app.models.ledger import BonusLedger

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

TARGET_FACTURAS = ["4324", "121"]

async def cleanup_invoices(commit=False):
    async with AsyncSessionLocal() as db:
        logging.info(f"STARTING CLEANUP for facturas: {TARGET_FACTURAS}")
        mode = "COMMIT" if commit else "DRY RUN (Viewing only)"
        logging.info(f"MODE: {mode}")

        # 1. Find Invoices
        stmt = select(Invoice).where(Invoice.factura_number.in_(TARGET_FACTURAS))
        result = await db.execute(stmt)
        invoices = result.scalars().all()
        
        if not invoices:
            logging.warning("No invoices found matching these numbers!")
            return

        invoice_ids = [inv.id for inv in invoices]
        reservation_ids = [inv.reservation_id for inv in invoices]
        
        logging.info(f"FOUND {len(invoices)} INVOICES. IDs: {invoice_ids}")
        logging.info(f"RELATED RESERVATION IDs: {reservation_ids}")

        # 2. Find Payments
        stmt = select(Payment).where(Payment.invoice_id.in_(invoice_ids))
        result = await db.execute(stmt)
        payments = result.scalars().all()
        payment_ids = [p.id for p in payments]
        logging.info(f"FOUND {len(payments)} PAYMENTS. IDs: {payment_ids}")

        # 3. Find ReservationItems
        stmt = select(ReservationItem).where(ReservationItem.reservation_id.in_(reservation_ids))
        result = await db.execute(stmt)
        res_items = result.scalars().all()
        res_item_ids = [item.id for item in res_items]
        logging.info(f"FOUND {len(res_items)} RESERVATION ITEMS. IDs: {res_item_ids}")

        # 4. Find BonusLedger entries linked via payments or reservationItems
        # (Using payment_id or invoice_item_id)
        stmt = select(BonusLedger).where(
            (BonusLedger.payment_id.in_(payment_ids)) | 
            (BonusLedger.invoice_item_id.in_(res_item_ids))
        )
        result = await db.execute(stmt)
        bonus_ledgers = result.scalars().all()
        bonus_ids = [b.id for b in bonus_ledgers]
        logging.info(f"FOUND {len(bonus_ledgers)} BONUS LEDGER ENTRIES. IDs: {bonus_ids}")

        # 5. Find UnassignedSales
        stmt = select(UnassignedSale).where(UnassignedSale.invoice_id.in_(invoice_ids))
        result = await db.execute(stmt)
        unassigned_sales = result.scalars().all()
        unassigned_ids = [u.id for u in unassigned_sales]
        logging.info(f"FOUND {len(unassigned_sales)} UNASSIGNED SALES. IDs: {unassigned_ids}")

        if not commit:
            logging.info("DRY RUN FINISHED. No data was modified. Run with --commit to apply.")
            return

        # 6. DELETE IN REVERSE ORDER
        try:
            # Delete BonusLedger
            if bonus_ids:
                logging.info(f"Deleting {len(bonus_ids)} BonusLedger entries...")
                await db.execute(delete(BonusLedger).where(BonusLedger.id.in_(bonus_ids)))
            
            # Delete Payments
            if payment_ids:
                logging.info(f"Deleting {len(payment_ids)} Payments...")
                await db.execute(delete(Payment).where(Payment.id.in_(payment_ids)))

            # Delete UnassignedSale
            if unassigned_ids:
                logging.info(f"Deleting {len(unassigned_ids)} Unassigned Sales...")
                await db.execute(delete(UnassignedSale).where(UnassignedSale.id.in_(unassigned_ids)))

            # Delete ReservationItems
            if res_item_ids:
                logging.info(f"Deleting {len(res_item_ids)} Reservation Items...")
                await db.execute(delete(ReservationItem).where(ReservationItem.id.in_(res_item_ids)))

            # Delete Invoices
            if invoice_ids:
                logging.info(f"Deleting {len(invoice_ids)} Invoices...")
                await db.execute(delete(Invoice).where(Invoice.id.in_(invoice_ids)))

            # Delete Reservations
            if reservation_ids:
                logging.info(f"Deleting {len(reservation_ids)} Reservations...")
                await db.execute(delete(Reservation).where(Reservation.id.in_(reservation_ids)))

            await db.commit()
            logging.info("ALL DELETIONS COMMITTED SUCCESSFULLY.")
        except Exception as e:
            await db.rollback()
            logging.error(f"CLEANUP FAILED! Rollback performed. Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", action="store_true", help="Perform actual deletion")
    args = parser.parse_args()
    
    asyncio.run(cleanup_invoices(commit=args.commit))
