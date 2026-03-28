import asyncio
import sys
import os

# Add the parent directory to the path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import delete, select, update
from app.db.session import AsyncSessionLocal, engine
from app.models.sales import Reservation, ReservationItem, Invoice, Payment, UnassignedSale, DoctorFactAssignment, BonusPayment
from app.models.warehouse import Stock, StockMovement
from app.models.crm import MedicalOrganization, MedicalOrganizationStock
from app.models.ledger import BonusLedger, DoctorMonthlyStat

async def clear_sales_data():
    print("Starting full sales data cleanup and stock restoration...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Restore Warehouse Stock
            print("Restoring Warehouse Stock from Reservations...")
            # We need to process all reservations before deleting them
            res_query = select(Reservation).options(
                selectinload(Reservation.items)
            )
            res_result = await db.execute(res_query)
            reservations = res_result.scalars().all()
            
            for res in reservations:
                for item in res.items:
                    # Find the stock row in the original warehouse
                    stock_query = select(Stock).where(
                        (Stock.warehouse_id == res.warehouse_id) &
                        (Stock.product_id == item.product_id)
                    ).with_for_update()
                    stock_res = await db.execute(stock_query)
                    stock_row = stock_res.scalar_one_or_none()
                    
                    if stock_row:
                        print(f"Restoring {item.quantity} units of product {item.product_id} to warehouse {res.warehouse_id}")
                        stock_row.quantity += item.quantity
                    else:
                        # If stock row doesn't exist anymore, recreate it
                        print(f"Recreating stock row for product {item.product_id} in warehouse {res.warehouse_id}")
                        new_stock = Stock(
                            warehouse_id=res.warehouse_id,
                            product_id=item.product_id,
                            quantity=item.quantity
                        )
                        db.add(new_stock)

            # 2. Reset Pharmacy Stocks (returned to warehouse per user request)
            print("Resetting all Pharmacy Stocks (MedicalOrganizationStock) to 0...")
            await db.execute(update(MedicalOrganizationStock).values(quantity=0))
            
            # 3. Reset Medical Organization Credit Balances
            print("Resetting all MedicalOrganization credit balances to 0...")
            await db.execute(update(MedicalOrganization).values(credit_balance=0.0))

            # 4. Delete All Sales Records
            print("Deleting all Payments...")
            await db.execute(delete(Payment))
            
            print("Deleting all Invoices...")
            await db.execute(delete(Invoice))
            
            print("Deleting all ReservationItems...")
            await db.execute(delete(ReservationItem))
            
            print("Deleting all Reservations...")
            await db.execute(delete(Reservation))
            
            print("Deleting all StockMovements...")
            await db.execute(delete(StockMovement))
            
            # 5. Optional: Re-clear bonuses just in case something was missed during cascade or re-created
            print("Final Bonus Cleanup...")
            await db.execute(delete(BonusLedger))
            await db.execute(delete(BonusPayment))
            await db.execute(delete(DoctorFactAssignment))
            await db.execute(delete(DoctorMonthlyStat))
            await db.execute(delete(UnassignedSale))

            await db.commit()
            print("Successfully restored stock and cleared all sales/financial data.")
        except Exception as e:
            await db.rollback()
            print(f"Error during cleanup: {e}")
            import traceback
            traceback.print_exc()
            raise e
        finally:
            await db.close()

if __name__ == "__main__":
    from sqlalchemy.orm import selectinload
    asyncio.run(clear_sales_data())
