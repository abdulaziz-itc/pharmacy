from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, delete, func
from sqlalchemy.orm import selectinload
import logging

from app.api import deps
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse, Stock, StockMovement, StockMovementType
from app.models.sales import Reservation, Invoice, ReservationStatus
from app.schemas.warehouse import Warehouse as WarehouseSchema, WarehouseCreate, StockFulfillment
from app.services.audit_service import log_action
from app.services.reservation_service import ReservationService

router = APIRouter()

@router.get("/warehouses/", response_model=List[WarehouseSchema])
async def get_warehouses(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    include_pharmacy: bool = False,
) -> Any:
    # Allowed roles for listing warehouses
    allowed = {
        UserRole.HEAD_OF_WAREHOUSE, 
        UserRole.HEAD_OF_ORDERS, 
        UserRole.DIRECTOR, 
        UserRole.DEPUTY_DIRECTOR, 
        UserRole.ADMIN,
        UserRole.MED_REP,
        UserRole.PRODUCT_MANAGER,
        UserRole.FIELD_FORCE_MANAGER,
        UserRole.REGIONAL_MANAGER
    }
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    from app.models.warehouse import WarehouseType
    from app.models.crm import MedicalOrganization
    from sqlalchemy import or_
    
    query = select(Warehouse).options(
        selectinload(Warehouse.stocks).selectinload(Stock.product)
    )
    if not include_pharmacy:
        query = query.outerjoin(MedicalOrganization, Warehouse.med_org_id == MedicalOrganization.id)
        query = query.where(
            or_(
                Warehouse.med_org_id == None,
                MedicalOrganization.org_type != "pharmacy"
            )
        )
        
    result = await db.execute(query)
    warehouses = result.scalars().all()
    
    # Map product_name for each stock item to satisfy the schema
    for warehouse in warehouses:
        for stock in warehouse.stocks:
            if stock.product:
                stock.product_name = stock.product.name
            else:
                stock.product_name = "Unknown Product"
                
    return warehouses

@router.post("/warehouses/", response_model=WarehouseSchema)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    allowed = {UserRole.INVESTOR, UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_obj = Warehouse(**warehouse_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    # Reload with stocks
    result = await db.execute(
        select(Warehouse).options(selectinload(Warehouse.stocks)).where(Warehouse.id == db_obj.id)
    )
    db_obj = result.scalar_one()

    await log_action(
        db, current_user, "CREATE", "Warehouse", db_obj.id,
        f"Создан новый склад: {db_obj.name}",
        request
    )
    return db_obj

@router.post("/warehouses/{id}/stock")
async def add_stock(
    id: int,
    fulfillment_in: StockFulfillment,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add stock to a warehouse."""
    allowed = {UserRole.INVESTOR, UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    stock_query = select(Stock).where(
        (Stock.warehouse_id == id) & 
        (Stock.product_id == fulfillment_in.product_id)
    ).with_for_update()
    
    result = await db.execute(stock_query)
    stock = result.scalar_one_or_none()
    
    if stock:
        old_qty = stock.quantity
        stock.quantity += fulfillment_in.quantity
    else:
        old_qty = 0
        stock = Stock(
            warehouse_id=id,
            product_id=fulfillment_in.product_id,
            quantity=fulfillment_in.quantity
        )
        db.add(stock)

    await db.flush()
    
    movement = StockMovement(
        stock_id=stock.id,
        movement_type=StockMovementType.PURCHASE,
        quantity_change=fulfillment_in.quantity
    )
    db.add(movement)
    await db.commit()

    await log_action(
        db, current_user, "UPDATE", "Stock", stock.id,
        f"Пополнение склада: Склад #{id}, Продукт #{fulfillment_in.product_id}, "
        f"Кол-во: +{fulfillment_in.quantity} (Было: {old_qty} → Стало: {stock.quantity})",
        request
    )
    return {"ok": True, "new_quantity": stock.quantity}

@router.get("/deletion-requests", response_model=Any)
async def get_deletion_requests(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all reservations and invoices pending deletion."""
    
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN, UserRole.INVESTOR]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        from app.models.sales import Reservation, Invoice, ReservationItem
        from app.schemas.sales import DeletionRequests, ApprovalReservationSchema, ApprovalInvoiceSchema
        
        # Reservations pending deletion
        res_query = (
            select(Reservation)
            .options(
                selectinload(Reservation.med_org),
                selectinload(Reservation.items).selectinload(ReservationItem.product)
            )
            .where(Reservation.is_deletion_pending == True)
        )
        res_result = await db.execute(res_query)
        reservations = res_result.scalars().all()
        
        # Invoices pending deletion (Facturas)
        inv_query = (
            select(Invoice)
            .options(
                selectinload(Invoice.reservation).options(
                    selectinload(Reservation.med_org),
                    selectinload(Reservation.items).selectinload(ReservationItem.product)
                )
            )
            .where(Invoice.is_deletion_pending == True)
        )
        inv_result = await db.execute(inv_query)
        invoices = inv_result.scalars().all()
        
        # SUPER DEEP DEBUG ON LIVE DB
        all_inv_ids_res = await db.execute(select(Invoice.id))
        actual_ids_in_db = [r[0] for r in all_inv_ids_res.all()]
        
        # COUNT GHOSTS
        pending_inv_count = await db.execute(select(func.count(Invoice.id)).where(Invoice.is_deletion_pending == True))
        pending_res_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.is_deletion_pending == True))
        pending_ret_count = await db.execute(select(func.count(Reservation.id)).where(Reservation.is_return_pending == True))
        
        stats = {
            "total_invoices": len(actual_ids_in_db),
            "pending_invoices_in_db": pending_inv_count.scalar(),
            "pending_reservations_in_db": pending_res_count.scalar(),
            "pending_returns_in_db": pending_ret_count.scalar(),
        }
        logging.info(f"LIVE STATS: {stats}")
        
        # Pending returns
        ret_query = (
            select(Reservation)
            .options(
                selectinload(Reservation.med_org),
                selectinload(Reservation.items).selectinload(ReservationItem.product)
            )
            .where(Reservation.is_return_pending == True)
        )
        ret_result = await db.execute(ret_query)
        return_requests = ret_result.scalars().all()

        # MANUAL MAPPING for maximum robustness
        def map_reservation(r):
            res_items = []
            for item in r.items:
                res_items.append({
                    "product_name": item.product.name if item.product else "N/A",
                    "quantity": item.quantity,
                    "price": item.price,
                    "total_price": item.total_price
                })
            return {
                "id": r.id,
                "customer_name": r.customer_name,
                "med_org_name": r.med_org.name if r.med_org else None,
                "date": r.date.isoformat() if r.date else None,
                "total_amount": r.total_amount,
                "items": res_items
            }

        def map_return(r):
            res_items = []
            return_total_net = 0.0
            for item in r.items:
                if (item.return_requested_quantity or 0) > 0:
                    qty = item.return_requested_quantity
                    item_net = (qty * item.price) * (1 - (item.discount_percent or 0) / 100)
                    return_total_net += item_net
                    res_items.append({
                        "product_name": item.product.name if item.product else "N/A",
                        "quantity": qty,
                        "price": item.price,
                        "total_price": item_net # Value being returned
                    })
            
            # Return with NDS
            return_total_with_nds = return_total_net * (1 + (r.nds_percent or 0) / 100)
            
            return {
                "id": r.id,
                "customer_name": r.customer_name,
                "med_org_name": r.med_org.name if r.med_org else None,
                "date": r.date.isoformat() if r.date else None,
                "total_amount": return_total_with_nds, # Actual return amount
                "full_reservation_amount": r.total_amount,
                "items": res_items
            }

        mapped_reservations = [map_reservation(r) for r in reservations]
        mapped_returns = [map_return(r) for r in return_requests]
        
        # Invoices
        debug_invoices = []
        for i in invoices:
            inv_data = {
                "id": i.id,
                "factura_number": f"DB_ID:{i.id} | ALL:{actual_ids_in_db} | {i.factura_number}",
                "date": i.date.isoformat() if i.date else None,
                "total_amount": i.total_amount,
                "reservation": map_reservation(i.reservation) if i.reservation else None
            }
            debug_invoices.append(inv_data)

        import time
        return {
            "reservations": mapped_reservations,
            "invoices": debug_invoices,
            "return_requests": mapped_returns,
            "debug_timestamp": time.time(),
            "debug_stats": stats
        }
    except Exception as e:
        import traceback
        logging.error(f"FETCH FAILED: {str(e)}", exc_info=True)
        return {
            "error": True,
            "detail": f"FETCH FAILED: {str(e)}",
            "trace": traceback.format_exc()[-500:],
            "reservations": [], "invoices": [], "return_requests": []
        }

@router.post("/deletion-requests/return/{entity_id}/approve")
async def approve_return(
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    from app.crud import crud_sales
    await crud_sales.execute_return_reservation_items(db, entity_id)
    await log_action(db, current_user, "RETURN_APPROVED", "Reservation", entity_id, f"Возврат по брони #{entity_id} одобрен складом.", request)
    return {"ok": True}

@router.post("/deletion-requests/return/{entity_id}/reject")
async def reject_return(
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    from app.crud import crud_sales
    await crud_sales.reject_return_reservation_items(db, entity_id)
    await log_action(db, current_user, "RETURN_REJECTED", "Reservation", entity_id, f"Возврат по брони #{entity_id} отклонен складом.", request)
    return {"ok": True}

@router.post("/deletion-requests/{entity_type}/{entity_id}/approve")
async def approve_deletion(
    entity_type: str,
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    logging.info(f"ACTION: {entity_type} ID {entity_id} request for approval by user {current_user.id}")
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if entity_type == "reservation":
        # Call service to actually cancel/delete and restore stock
        await ReservationService.cancel_reservation(db, entity_id)
        await log_action(db, current_user, "DELETE_APPROVED", "Reservation", entity_id, f"Удаление брони #{entity_id} одобрено.", request)
    elif entity_type == "invoice":
        # Invoices are often deleted by cancelling the reservation if linked
        # Find the reservation first
        inv_query = select(Invoice).where(Invoice.id == entity_id)
        inv_res = await db.execute(inv_query)
        invoice = inv_res.scalar_one_or_none()
        if not invoice:
            # Deep debug: list all IDs
            all_invoices = await db.execute(select(Invoice.id))
            ids = [row[0] for row in all_invoices.all()]
            raise HTTPException(status_code=404, detail=f"Invoice #{entity_id} not found (APPROVE). Available IDs: {ids}")
        
        res_id = invoice.reservation_id
        await ReservationService.cancel_reservation(db, res_id)
        await log_action(db, current_user, "DELETE_APPROVED", "Invoice", entity_id, f"Удаление фактуры #{entity_id} одобрено.", request)
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    
    return {"ok": True}

@router.post("/deletion-requests/{entity_type}/{entity_id}/reject")
async def reject_deletion(
    entity_type: str,
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    logging.info(f"ACTION: {entity_type} ID {entity_id} request for REJECTION by user {current_user.id}")
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if entity_type == "reservation":
        res_query = select(Reservation).where(Reservation.id == entity_id)
        res_res = await db.execute(res_query)
        res = res_res.scalar_one_or_none()
        if res:
            res.is_deletion_pending = False
            res.deletion_requested_by_id = None
            await db.commit()
            await log_action(db, current_user, "DELETE_REJECTED", "Reservation", entity_id, f"Удаление брони #{entity_id} отклонено.", request)
    elif entity_type == "invoice":
        inv_query = select(Invoice).where(Invoice.id == entity_id)
        inv_res = await db.execute(inv_query)
        inv = inv_res.scalar_one_or_none()
        if inv:
            inv.is_deletion_pending = False
            inv.deletion_requested_by_id = None
            await db.commit()
            await log_action(db, current_user, "DELETE_REJECTED", "Invoice", entity_id, f"Удаление фактуры #{entity_id} отклонено.", request)
        else:
            # Deep debug: list all IDs
            all_invoices = await db.execute(select(Invoice.id))
            ids = [row[0] for row in all_invoices.all()]
            raise HTTPException(status_code=404, detail=f"Invoice #{entity_id} not found (REJECT). Available IDs: {ids}")
    
    return {"ok": True}

@router.post("/deletion-requests/force-cleanup")
async def force_cleanup(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Forcefully delete everything marked for deletion (Emergency ONLY)."""
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Director can force cleanup")
    
    try:
        # 1. Nullify all cross-table foreign keys to avoid circular dependency errors
        # Nullify Reservation.source_invoice_id
        await db.execute(update(Reservation).where(Reservation.is_deletion_pending == True).values(source_invoice_id=None))
        # Nullify Invoice.reservation_id (careful, it's unique)
        await db.execute(update(Invoice).where(Invoice.is_deletion_pending == True).values(reservation_id=None))
        await db.flush()

        # 2. Delete payments and unassigned sales first (to avoid FK errors from Invoice)
        from app.models.sales import Payment, UnassignedSale
        pending_inv_ids = select(Invoice.id).where(Invoice.is_deletion_pending == True)
        await db.execute(delete(Payment).where(Payment.invoice_id.in_(pending_inv_ids)))
        await db.execute(delete(UnassignedSale).where(UnassignedSale.invoice_id.in_(pending_inv_ids)))

        # 3. Delete invoices
        res_inv = await db.execute(delete(Invoice).where(Invoice.is_deletion_pending == True))
        invoices_deleted = res_inv.rowcount
        
        # 4. Delete reservations (cascade triggers for items)
        res_res = await db.execute(delete(Reservation).where(Reservation.is_deletion_pending == True))
        reservations_deleted = res_res.rowcount
        
        await db.commit()
        return {
            "ok": True, 
            "message": f"CLEANUP SUCCESS: Deleted {invoices_deleted} invoices and {reservations_deleted} reservations.",
            "invoices_deleted": invoices_deleted,
            "reservations_deleted": reservations_deleted
        }
    except Exception as e:
        await db.rollback()
        logging.error(f"Force cleanup failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"FORCE-CLEANUP FAILED: {str(e)}")
