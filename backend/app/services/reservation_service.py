from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.models.sales import Reservation, ReservationItem, ReservationStatus
from app.models.warehouse import Stock, StockMovement, StockMovementType
from app.schemas.sales import ReservationCreate
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReservationService:
    @staticmethod
    async def create_reservation_with_stock_lock(db: AsyncSession, obj_in: ReservationCreate, user_id: int):
        """
        Creates a Reservation transactionally.
        It strictly locks the `warehouse_stock` rows BEFORE creating the reservation to prevent
        race conditions (e.g. overselling).
        """
        # Ensure we have a warehouse
        warehouse_id = obj_in.warehouse_id
        if not warehouse_id:
            raise HTTPException(status_code=400, detail="Reservation requires a source warehouse_id")
            
        product_quantities = {item.product_id: item.quantity for item in obj_in.items}
        product_ids = list(product_quantities.keys())
        
        # Start the strict transactional scope
        async with db.begin_nested() as transaction:
            try:
                # 1. PESSIMISTIC LOCKING: Lock the requested stock rows FOR UPDATE
                stock_query = select(Stock).where(
                    (Stock.warehouse_id == warehouse_id) & 
                    (Stock.product_id.in_(product_ids))
                ).with_for_update() # ROW-LEVEL LOCK
                
                stock_result = await db.execute(stock_query)
                stocks = {s.product_id: s for s in stock_result.scalars().all()}
                
                total_amount = 0.0
                
                # 2. Validation & Deductions
                for item in obj_in.items:
                    stock_row = stocks.get(item.product_id)
                    if not stock_row:
                        raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found in Warehouse {warehouse_id}")
                    if stock_row.quantity < item.quantity:
                        raise HTTPException(status_code=400, detail=f"Insufficient stock for Product {item.product_id}. Requested: {item.quantity}, Available: {stock_row.quantity}")
                    
                    # Deduct the stock purely in memory (flushed at commit)
                    stock_row.quantity -= item.quantity
                    
                    item_total_price = (item.price * item.quantity) * (1 - item.discount_percent / 100)
                    total_amount += item_total_price
                
                # 3. Create Reservation Model
                db_reservation = Reservation(
                    created_by_id=user_id,
                    customer_name=obj_in.customer_name,
                    med_org_id=obj_in.med_org_id,
                    warehouse_id=warehouse_id,
                    validity_date=obj_in.validity_date,
                    description=obj_in.description,
                    total_amount=total_amount,
                    status=ReservationStatus.PENDING # Default pending head of orders
                )
                db.add(db_reservation)
                await db.flush() # Get the reservation ID
                
                # 4. Create Reservation Items and Stock Movements
                db_items = []
                for item_in in obj_in.items:
                    # Item
                    db_item = ReservationItem(
                        reservation_id=db_reservation.id,
                        product_id=item_in.product_id,
                        quantity=item_in.quantity,
                        price=item_in.price,
                        discount_percent=item_in.discount_percent,
                        total_price=(item_in.price * item_in.quantity) * (1 - item_in.discount_percent / 100)
                    )
                    db_items.append(db_item)
                    
                    # Stock Movement (Audit Log)
                    db_movement = StockMovement(
                        stock_id=stocks[item_in.product_id].id,
                        movement_type=StockMovementType.RESERVATION,
                        quantity_change=-item_in.quantity,
                        reference_id=db_reservation.id
                    )
                    db.add(db_movement)
                    
                db.add_all(db_items)
                await db.commit() # Unleash the lock
                
                return db_reservation
            except HTTPException:
                await transaction.rollback()
                raise
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Database transaction error: {str(e)}")

    @staticmethod
    async def activate_reservation(db: AsyncSession, reservation_id: int):
        """
        Activates a Pending/Draft reservation:
        1. Deducts final stock from warehouse.
        2. Creates Invoice (Factura).
        3. Creates UnassignedSale records for MedRep assignment.
        4. Updates status to APPROVED.
        """
        from app.models.sales import Invoice, InvoiceStatus, UnassignedSale
        from sqlalchemy.orm import selectinload

        try:
            # 1. Fetch reservation with items
            query = select(Reservation).options(selectinload(Reservation.items)).where(Reservation.id == reservation_id)
            result = await db.execute(query)
            reservation = result.scalars().first()

            if not reservation:
                raise HTTPException(status_code=404, detail="Reservation not found")
            if reservation.status == ReservationStatus.APPROVED:
                raise HTTPException(status_code=400, detail="Reservation already active/approved")

            # 2. Skip Stock Deduction (Already deducted during creation)
            # We just verify the reservation exists and is not approved (already checked above)

            # 3. Create Invoice (Factura)
            invoice = Invoice(
                reservation_id=reservation.id,
                total_amount=reservation.total_amount,
                status=InvoiceStatus.DRAFT,
                realization_date=datetime.utcnow() 
            )
            db.add(invoice)
            await db.flush()

            # 5. Increment Pharmacy Stock (Ostatki Aptek)
            from app.models.crm import MedicalOrganizationStock
            for item in reservation.items:
                # Find or create stock record for this pharmacy/product
                stk_query = select(MedicalOrganizationStock).where(
                    (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                    (MedicalOrganizationStock.product_id == item.product_id)
                ).with_for_update()
                stk_result = await db.execute(stk_query)
                pharm_stock = stk_result.scalar_one_or_none()
                
                if pharm_stock:
                    pharm_stock.quantity += item.quantity
                else:
                    pharm_stock = MedicalOrganizationStock(
                        med_org_id=reservation.med_org_id,
                        product_id=item.product_id,
                        quantity=item.quantity
                    )
                    db.add(pharm_stock)

            # 6. Create UnassignedSale records for the MedRep (creator)
            for item in reservation.items:
                unassigned = UnassignedSale(
                    invoice_id=invoice.id,
                    med_rep_id=reservation.created_by_id,
                    product_id=item.product_id,
                    total_quantity=item.quantity,
                    paid_quantity=0,
                    assigned_quantity=0
                )
                db.add(unassigned)

            # 6. Update status
            reservation.status = ReservationStatus.APPROVED
            
            await db.commit()
            return reservation
        except Exception as e:
            logger.error(f"Critical error in activate_reservation for id {reservation_id}: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    @staticmethod
    async def cancel_reservation(db: AsyncSession, reservation_id: int):
        """
        Cancels a reservation and restores stock to the warehouse.
        """
        from sqlalchemy.orm import selectinload
        
        # 1. Fetch reservation with items
        query = select(Reservation).options(selectinload(Reservation.items)).where(Reservation.id == reservation_id)
        result = await db.execute(query)
        reservation = result.scalars().first()

        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        if reservation.status == ReservationStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Cannot cancel an approved reservation")

        # 2. Restore stock
        product_ids = [item.product_id for item in reservation.items]
        stock_query = select(Stock).where(
            (Stock.warehouse_id == reservation.warehouse_id) & 
            (Stock.product_id.in_(product_ids))
        ).with_for_update()
        
        stock_result = await db.execute(stock_query)
        stocks = {s.product_id: s for s in stock_result.scalars().all()}

        for item in reservation.items:
            stock_row = stocks.get(item.product_id)
            if stock_row:
                stock_row.quantity += item.quantity
                
                # Record restoration movement
                db_movement = StockMovement(
                    stock_id=stock_row.id,
                    movement_type=StockMovementType.ADJUSTMENT, # Or a specific RESTORATION type if added
                    quantity_change=item.quantity,
                    reference_id=reservation.id
                )
                db.add(db_movement)

        # 3. Delete or Update Status (User requested delete)
        await db.delete(reservation)
        await db.commit()
        return True
