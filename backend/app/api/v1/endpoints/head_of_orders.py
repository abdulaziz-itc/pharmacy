from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

from app.api import deps
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse, Stock
from app.models.sales import Reservation, Invoice, Payment, ReservationStatus
from app.schemas.sales import Reservation as ReservationSchema, Invoice as InvoiceSchema, Payment as PaymentSchema, PaymentCreate, ReservationDataUpdate
from app.crud import crud_sales
from app.services.reservation_service import ReservationService
from app.services.finance_service import FinancialService
from app.services.audit_service import log_action

router = APIRouter()

from app.schemas.warehouse import WarehouseCreate, StockFulfillment, Warehouse as WarehouseSchema

# --- Warehouse Management ---

@router.get("/warehouses/", response_model=List[WarehouseSchema])
async def get_warehouses(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Warehouse).options(selectinload(Warehouse.stocks)))
    return result.scalars().all()

@router.post("/warehouses/", response_model=WarehouseSchema)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_obj = Warehouse(**warehouse_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Re-fetch with eager loaded stocks to avoid async lazy-load 500 error
    from sqlalchemy.orm import selectinload
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

@router.post("/warehouses/{id}/fulfill")
async def fulfill_stock(
    id: int,
    fulfillment_in: StockFulfillment,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add stock to a warehouse (Prixod)."""
    if current_user.role not in [UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # 1. Check if stock record exists
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

    # 2. Record movement
    from app.models.warehouse import StockMovement, StockMovementType
    await db.flush()
    
    movement = StockMovement(
        stock_id=stock.id,
        movement_type=StockMovementType.PURCHASE,
        quantity_change=fulfillment_in.quantity
    )
    db.add(movement)
    await db.commit()

    # 3. Audit log
    await log_action(
        db, current_user, "CREATE", "StockFulfillment", stock.id,
        f"Приход на склад: Склад #{id}, Продукт #{fulfillment_in.product_id}, "
        f"Кол-во: +{fulfillment_in.quantity} (Было: {old_qty} → Стало: {stock.quantity})",
        request
    )

    return {"ok": True, "new_quantity": stock.quantity}

# --- Reservation Management ---

@router.get("/reservations/", response_model=List[ReservationSchema])
async def list_reservations(
    status: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    from sqlalchemy.orm import selectinload
    from app.models.sales import ReservationItem
    from app.models.product import Product
    from app.models.warehouse import Warehouse
    from app.models.crm import MedicalOrganization
    try:
        query = select(Reservation).options(
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
            selectinload(Reservation.created_by),
            selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by)
        ).order_by(Reservation.date.desc())
        if status:
            query = query.where(Reservation.status == status)
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error listing reservations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reservations/{id}/activate", response_model=ReservationSchema)
async def activate_reservation(
    id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Activate a reservation: Lock stock and create Factura."""
    if current_user.role not in [UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        reservation = await ReservationService.activate_reservation(db, id)

        await log_action(
            db, current_user, "UPDATE", "Reservation", id,
            f"Бронь #{id} активирована (Клиент: {reservation.customer_name}, "
            f"Сумма: {reservation.total_amount:,.0f} UZS). Счет-фактура создана автоматически.",
            request
        )
        return reservation
    except Exception as e:
        logger.error(f"Error activating reservation {id}: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/reservations/{id}")
async def delete_reservation(
    id: int,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete a reservation if it's not active, or request deletion (Head of Orders)."""
    from sqlalchemy.orm import selectinload
    from app.models.sales import Reservation, Invoice
    res_query = select(Reservation).options(selectinload(Reservation.invoice)).where(Reservation.id == id)
    res_exc = await db.execute(res_query)
    reservation = res_exc.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # If Head of Orders, mark for deletion instead of canceling immediately
    if current_user.role == UserRole.HEAD_OF_ORDERS:
        from app.models.sales import InvoiceStatus
        # If reservation has an invoice, mark the invoice for deletion instead
        # This makes it appear in "Invoices" section for Warehouse approval
        if reservation.invoice:
            if reservation.invoice.status == InvoiceStatus.PAID:
                raise HTTPException(status_code=400, detail="Нельзя удалить оплаченную счет-фактуру. Сначала отмените платежи.")
                
            reservation.invoice.is_deletion_pending = True
            reservation.invoice.deletion_requested_by_id = current_user.id
        else:
            reservation.is_deletion_pending = True
            reservation.deletion_requested_by_id = current_user.id
        
        await db.commit()
        
        await log_action(
            db, current_user, "DELETE_REQUESTED", "Reservation", id,
            f"Запрошено удаление брони #{id}. Ожидает подтверждения склада.",
            request
        )
        return {"ok": True, "message": "Deletion request sent to Warehouse Head."}

    # Director/Admin can still delete immediately
    await ReservationService.cancel_reservation(db, id)

    await log_action(
        db, current_user, "DELETE", "Reservation", id,
        f"Бронь #{id} удалена, товары возвращены на склад.",
        request
    )
    return {"ok": True}

@router.patch("/reservations/{id}/data", response_model=ReservationSchema)
async def update_reservation_data(
    id: int,
    obj_in: ReservationDataUpdate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update reservation data like invoice number, date, or discount."""
    if current_user.role not in [UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    reservation = await crud_sales.update_reservation_data(db, id, obj_in)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    await log_action(
        db, current_user, "UPDATE", "Reservation", id,
        f"Данные брони обновлены: Счет-фактура #{obj_in.factura_number or '? '}, "
        f"Дата: {obj_in.realization_date or '? '}, Скидка: {obj_in.discount_percent or '? '}%",
        request
    )
    return reservation

# --- Payments (Postupleniya) ---

@router.post("/payments/", response_model=PaymentSchema)
async def create_payment(
    obj_in: PaymentCreate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    payment = await FinancialService.process_payment(db, obj_in, current_user.id)

    await log_action(
        db, current_user, "CREATE", "Payment", payment.id,
        f"Оплата принята: Счет-фактура #{obj_in.invoice_id}, "
        f"Сумма: {obj_in.amount:,.0f} UZS, "
        f"Тип: {obj_in.payment_type}",
        request
    )
    return payment


# --- Invoices (Fakturalar) ---

@router.get("/invoices/", response_model=List[InvoiceSchema])
async def list_invoices(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all invoices for Head of Orders."""
    from sqlalchemy.orm import selectinload
    from app.models.sales import Invoice as InvoiceModel, ReservationItem, Reservation, Payment
    from app.models.product import Product
    from app.models.crm import MedicalOrganization
    from app.models.warehouse import Warehouse as WarehouseModel
    
    try:
        result = await db.execute(
            select(InvoiceModel)
            .join(InvoiceModel.reservation)
            .where(Reservation.status.in_(["approved", "paid", "partial"]))
            .options(
                selectinload(InvoiceModel.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.created_by),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.warehouse).selectinload(WarehouseModel.stocks),
                selectinload(InvoiceModel.reservation).selectinload(Reservation.invoice),
                selectinload(InvoiceModel.payments).selectinload(Payment.processed_by),
            ).order_by(InvoiceModel.id.desc())
        )
        return result.scalars().all()
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print("API ERROR:", trace)
        raise HTTPException(status_code=400, detail=str(e) + "\n" + trace)

