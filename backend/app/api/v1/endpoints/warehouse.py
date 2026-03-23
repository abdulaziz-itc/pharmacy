from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
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
) -> Any:
    # Only Warehouse Head, Orders Head, Director, Admin
    allowed = {UserRole.HEAD_OF_WAREHOUSE, UserRole.HEAD_OF_ORDERS, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.execute(select(Warehouse).options(selectinload(Warehouse.stocks)))
    return result.scalars().all()

@router.post("/warehouses/", response_model=WarehouseSchema)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    allowed = {UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN}
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
    allowed = {UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN}
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

from app.schemas.sales import DeletionRequests

@router.get("/deletion-requests", response_model=DeletionRequests)
async def get_deletion_requests(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all reservations and invoices pending deletion."""
    if current_user.role not in [UserRole.HEAD_OF_WAREHOUSE, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
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
        logging.info(f"RETURNING {len(reservations)} reservations for deletion: {[r.id for r in reservations]}")
        
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
        
        # SUPER DEEP DEBUG
        all_inv_ids = await db.execute(select(Invoice.id))
        actual_ids_in_db = [r[0] for r in all_inv_ids.all()]
        logging.info(f"FETCH: Found {len(invoices)} invoices. All IDs in DB: {actual_ids_in_db}")
        
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

        from app.schemas.sales import ApprovalReservationSchema, ApprovalInvoiceSchema
        
        # DEBUG: Embed real ID and the full available list in factura_number
        debug_invoices = []
        for i in invoices:
            schema = ApprovalInvoiceSchema.from_orm(i)
            schema.factura_number = f"DB_ID:{i.id} | ALL:{actual_ids_in_db} | {i.factura_number}"
            debug_invoices.append(schema)

        return {
            "reservations": [ApprovalReservationSchema.from_orm(r) for r in reservations],
            "invoices": debug_invoices,
            "return_requests": [ApprovalReservationSchema.from_orm(r) for r in return_requests]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
