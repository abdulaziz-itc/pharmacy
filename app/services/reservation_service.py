from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.models.sales import Reservation, ReservationItem, ReservationStatus
from app.models.warehouse import Stock, StockMovement, StockMovementType
from app.schemas.sales import ReservationCreate
from datetime import datetime

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
                    
                    item.total_price = (item.price * item.quantity) * (1 - item.discount_percent / 100)
                    total_amount += item.total_price
                
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
                        total_price=item_in.total_price
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
