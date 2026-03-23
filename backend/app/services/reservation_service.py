from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.sales import Reservation, ReservationItem, ReservationStatus, Invoice, InvoiceStatus, UnassignedSale, Payment, PaymentType
from app.models.warehouse import Warehouse, Stock, StockMovement, StockMovementType
from app.models.crm import MedicalOrganization, Region, MedicalOrganizationStock
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.sales import ReservationCreate
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ReservationService:
    @staticmethod
    async def create_reservation_with_stock_lock(db: AsyncSession, obj_in: ReservationCreate, user_id: int):
        """
        Creates a Reservation transactionally.
        Locks stock rows FOR UPDATE before deducting to prevent race conditions.
        """
        warehouse_id = obj_in.warehouse_id
        if not warehouse_id:
            raise HTTPException(status_code=400, detail="Reservation requires a source warehouse_id")

        product_ids = [item.product_id for item in obj_in.items]

        try:
            # 1. PESSIMISTIC LOCKING: Lock the requested stock rows FOR UPDATE
            stock_query = select(Stock).where(
                (Stock.warehouse_id == warehouse_id) &
                (Stock.product_id.in_(product_ids))
            ).with_for_update()

            stock_result = await db.execute(stock_query)
            stocks = {s.product_id: s for s in stock_result.scalars().all()}

            total_amount = 0.0

            # 2. Validation & stock deduction
            # Apply NDS multiplier at the end
            nds_multiplier = 1 + (obj_in.nds_percent / 100.0)
            
            for item in obj_in.items:
                stock_row = stocks.get(item.product_id)
                if not stock_row:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product {item.product_id} not found in Warehouse {warehouse_id}"
                    )
                if stock_row.quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for Product {item.product_id}. Requested: {item.quantity}, Available: {stock_row.quantity}"
                    )
                stock_row.quantity -= item.quantity
                
                # Fetch default product data for validation
                prod_query = select(Product).where(Product.id == item.product_id)
                prod_result = await db.execute(prod_query)
                product = prod_result.scalar_one_or_none()
                
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

                # Validation: 30% deviation limit
                if obj_in.is_bonus_eligible:
                    # 1. Price check
                    default_price = product.price
                    min_price = default_price * 0.7
                    max_price = default_price * 1.3
                    if item.price < min_price or item.price > max_price:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Цена товара '{product.name}' ({item.price:,.0f}) выходит за пределы допустимого отклонения 30% ([{min_price:,.0f} - {max_price:,.0f}])"
                        )
                    
                    # 2. Marketing amount check (Promo)
                    # User requirement: Max 30% of price
                    max_mkt = item.price * 0.3
                    if item.marketing_amount > max_mkt:
                         raise HTTPException(
                            status_code=400,
                            detail=f"Промо-сумма товара '{product.name}' ({item.marketing_amount:,.0f}) "
                                   f"не может превышать 30% от цены ({max_mkt:,.0f} UZS)"
                        )

                # Item amount BEFORE NDS
                item_total_plain = (item.price * item.quantity) * (1 - item.discount_percent / 100)
                total_amount += item_total_plain * nds_multiplier

            # 3. Create Reservation
            db_reservation = Reservation(
                created_by_id=user_id,
                customer_name=obj_in.customer_name,
                med_org_id=obj_in.med_org_id,
                warehouse_id=warehouse_id,
                validity_date=obj_in.validity_date.replace(tzinfo=None) if obj_in.validity_date else None,
                description=obj_in.description,
                total_amount=total_amount,
                is_bonus_eligible=obj_in.is_bonus_eligible,
                is_tovar_skidka=obj_in.is_tovar_skidka,
                source_invoice_id=obj_in.source_invoice_id,
                nds_percent=obj_in.nds_percent,
                status=ReservationStatus.PENDING,
            )
            db.add(db_reservation)
            await db.flush()  # get reservation ID

            # 4. Items + Stock Movements
            for item_in in obj_in.items:
                # We store base price in 'price', but 'total_price' includes NDS for consistency with total_amount
                # However, usually total_price in item level refers to qty * price. 
                # Let's align: if total_amount includes NDS, item.total_price should too.
                item_total_plain = (item_in.price * item_in.quantity) * (1 - item_in.discount_percent / 100)
                db.add(ReservationItem(
                    reservation_id=db_reservation.id,
                    product_id=item_in.product_id,
                    quantity=item_in.quantity,
                    price=item_in.price,
                    discount_percent=item_in.discount_percent,
                    marketing_amount=item_in.marketing_amount,
                    total_price=item_total_plain * nds_multiplier,
                ))
                db.add(StockMovement(
                    stock_id=stocks[item_in.product_id].id,
                    movement_type=StockMovementType.RESERVATION,
                    quantity_change=-item_in.quantity,
                    reference_id=db_reservation.id,
                ))

            await db.commit()

            # 5. Build modification summary for Audit
            modifications = []
            for item_in in obj_in.items:
                prod_row = next((stocks[sid] for sid in stocks if sid == item_in.product_id), None)
                # Need product for default values
                product_item = (await db.execute(select(Product).where(Product.id == item_in.product_id))).scalar_one_or_none()
                if product_item:
                    changes = []
                    if abs(item_in.price - product_item.price) > 0.01:
                        changes.append(f"Price: {product_item.price:,.0f} -> {item_in.price:,.0f}")
                    if abs(item_in.marketing_amount - (product_item.marketing_expense or 0)) > 0.01:
                        changes.append(f"Bonus: {getattr(product_item, 'marketing_expense', 0) or 0:,.0f} -> {item_in.marketing_amount:,.0f}")
                    
                    if changes:
                        modifications.append(f"{product_item.name} ({', '.join(changes)})")

            summary_str = "; ".join(modifications) if modifications else ""

            if summary_str:
                from app.services.audit_service import log_action
                user_res = await db.execute(select(User).where(User.id == user_id))
                user_obj = user_res.scalar_one_or_none()
                if user_obj:
                    await log_action(
                        db,
                        current_user=user_obj,
                        action="RESERVATION_MODIFIED",
                        entity_type="Reservation",
                        entity_id=db_reservation.id,
                        description=f"Изменение цен/бонуса при создании брони: {summary_str}",
                    )

            # 6. Re-fetch with relationships to avoid async lazy-load errors
            stmt = select(Reservation).options(
                selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
                selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
                selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
                selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
                selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
                selectinload(Reservation.created_by),
                selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by),
            ).where(Reservation.id == db_reservation.id)
            result = await db.execute(stmt)
            return result.scalars().first(), summary_str

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Reservation create failed: {str(e)}", exc_info=True)
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
        try:
            query = select(Reservation).options(
                selectinload(Reservation.items).selectinload(ReservationItem.product),
                selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps).selectinload(User.manager),
                selectinload(Reservation.created_by)
            ).where(Reservation.id == reservation_id)
            result = await db.execute(query)
            reservation = result.scalars().first()

            if not reservation:
                raise HTTPException(status_code=404, detail="Reservation not found")
            if reservation.status == ReservationStatus.APPROVED:
                raise HTTPException(status_code=400, detail="Reservation already active/approved")

            # 2. Skip Stock Deduction (Already deducted during creation)
            # We just verify the reservation exists and is not approved (already checked above)

            # 3. Create Invoice (Factura) if it doesn't already exist
            invoice_query = select(Invoice).where(Invoice.reservation_id == reservation.id)
            invoice_result = await db.execute(invoice_query)
            invoice = invoice_result.scalar_one_or_none()

            if not invoice:
                invoice = Invoice(
                    reservation_id=reservation.id,
                    total_amount=reservation.total_amount,
                    status=InvoiceStatus.DRAFT,
                )
                db.add(invoice)
                await db.flush()
            
            # Always set realization_date to now when activating/approving
            invoice.realization_date = datetime.utcnow()
                
            # Update existing invoice total_amount if it changed
            invoice.total_amount = reservation.total_amount

            # 5. Increment Pharmacy Stock (Ostatki Aptek)
            for item in reservation.items:
                # Find or create stock record for this pharmacy/product
                stk_query = select(MedicalOrganizationStock).where(
                    (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                    (MedicalOrganizationStock.product_id == item.product_id)
                ).with_for_update()
                stk_result = await db.execute(stk_query)
                pharm_stock = stk_result.scalar_one_or_none()
                
                # Check if we should increment stock. 
                # Note: This is simpler than keeping a separate "incremented" flag, but works
                # if we assume activation is the transition that triggers this.
                if reservation.status != ReservationStatus.APPROVED:
                    if pharm_stock:
                        pharm_stock.quantity += item.quantity
                    else:
                        pharm_stock = MedicalOrganizationStock(
                            med_org_id=reservation.med_org_id,
                            product_id=item.product_id,
                            quantity=item.quantity
                        )
                        db.add(pharm_stock)

            # 6. Create UnassignedSale records for the assigned MedRep (not necessarily creator)
            # Find the primary MedRep for this pharmacy
            target_med_rep_id = reservation.created_by_id # Fallback
            if reservation.med_org and reservation.med_org.assigned_reps:
                for rep in reservation.med_org.assigned_reps:
                    if rep.role == UserRole.MED_REP:
                        target_med_rep_id = rep.id
                        break

            for item in reservation.items:
                sale_query = select(UnassignedSale).where(
                    (UnassignedSale.invoice_id == invoice.id) &
                    (UnassignedSale.product_id == item.product_id)
                )
                sale_result = await db.execute(sale_query)
                if not sale_result.scalar_one_or_none():
                    unassigned = UnassignedSale(
                        invoice_id=invoice.id,
                        med_rep_id=target_med_rep_id,
                        product_id=item.product_id,
                        total_quantity=item.quantity,
                        paid_quantity=0,
                        assigned_quantity=0
                    )
                    db.add(unassigned)

            # 6. Apply existing credit balance (kreditorka)
            if reservation.med_org and (reservation.med_org.credit_balance or 0) > 0:
                credit_to_apply = min(reservation.med_org.credit_balance, invoice.total_amount - invoice.paid_amount)
                if credit_to_apply > 0:
                    invoice.paid_amount += credit_to_apply
                    reservation.med_org.credit_balance -= credit_to_apply
                    
                    if invoice.paid_amount >= invoice.total_amount:
                        invoice.status = InvoiceStatus.PAID
                    else:
                        invoice.status = InvoiceStatus.PARTIAL
                        
                    # Create payment record for the applied credit
                    credit_payment = Payment(
                        invoice_id=invoice.id,
                        amount=credit_to_apply,
                        payment_type=PaymentType.BANK,
                        processed_by_id=reservation.created_by_id,
                        comment="Автоматическое списание с баланса (кредиторка)"
                    )
                    db.add(credit_payment)

            # 6.5. Apply Tovar Skidka (Promo balance from another invoice)
            if reservation.is_tovar_skidka and reservation.source_invoice_id:
                # Deduct promo balance from source invoice and mark this one paid
                source_inv_query = select(Invoice).where(Invoice.id == reservation.source_invoice_id).with_for_update()
                source_inv_res = await db.execute(source_inv_query)
                source_inv = source_inv_res.scalar_one_or_none()
                
                if source_inv:
                    # Check if source invoice has enough promo balance
                    # Note: We allow full usage of the promo balance for this reservation
                    if source_inv.promo_balance >= (reservation.total_amount - invoice.paid_amount):
                        needed = reservation.total_amount - invoice.paid_amount
                        source_inv.promo_balance -= needed
                        
                        invoice.paid_amount += needed
                        invoice.status = InvoiceStatus.PAID
                        
                        # Add payment record
                        promo_payment = Payment(
                            invoice_id=invoice.id,
                            amount=needed,
                            payment_type=PaymentType.OTHER,
                            processed_by_id=reservation.created_by_id,
                            comment=f"Оплачено за счет промо-суммы накладной #{source_inv.id}"
                        )
                        db.add(promo_payment)
                        
                        # Set source invoice promo to 0 as per user request
                        source_inv.promo_balance = 0 
                    else:
                        raise HTTPException(status_code=400, detail=f"Недостаточно промо-суммы в накладной #{source_inv.id}")
                else:
                    raise HTTPException(status_code=400, detail="Исходная накладная для товарной скидки не найдена")

            # 7. Update status
            reservation.status = ReservationStatus.APPROVED
            
            await db.commit()

            # 7. Re-fetch with all relationships to ensure serialization works
            final_query = select(Reservation).options(
                selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
                selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
                selectinload(Reservation.created_by),
                selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
                selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
                selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
                selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by)
            ).where(Reservation.id == reservation_id)
            final_result = await db.execute(final_query)
            return final_result.scalars().first()
        except Exception as e:
            logger.error(f"Critical error in activate_reservation for id {reservation_id}: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    @staticmethod
    async def cancel_reservation(db: AsyncSession, reservation_id: int):
        """
        Cancels/deletes a reservation:
        - Restores stock to the source warehouse.
        - For APPROVED reservations: also reverses pharmacy stock increment.
        - Blocks deletion only if actual payments have been received (paid_amount > 0).
        """
        try:
            # 1. Fetch reservation with all needed relationships
            query = select(Reservation).options(
                selectinload(Reservation.items),
                selectinload(Reservation.invoice).selectinload(Invoice.payments),
            ).where(Reservation.id == reservation_id)
            result = await db.execute(query)
            reservation = result.scalars().first()

            if not reservation:
                raise HTTPException(status_code=404, detail="Reservation not found")

            # 2. Block if actual payments have been received or status is PAID
            invoice = reservation.invoice
            if invoice:
                if (invoice.paid_amount or 0) > 0 or invoice.status == InvoiceStatus.PAID:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Невозможно удалить: по этой накладной уже есть оплата или статус PAID. "
                               f"Сначала отмените оплату."
                    )

            product_ids = [item.product_id for item in reservation.items]

            # 3. Restore warehouse stock (always — stock was deducted on creation)
            if product_ids:
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
                        db.add(StockMovement(
                            stock_id=stock_row.id,
                            movement_type=StockMovementType.ADJUSTMENT,
                            quantity_change=item.quantity,
                            reference_id=reservation.id,
                        ))

            # 4. If APPROVED — reverse pharmacy stock increment (was added during activation)
            if reservation.status == ReservationStatus.APPROVED and product_ids:
                pharm_query = select(MedicalOrganizationStock).where(
                    (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                    (MedicalOrganizationStock.product_id.in_(product_ids))
                ).with_for_update()
                pharm_result = await db.execute(pharm_query)
                pharm_stocks = {s.product_id: s for s in pharm_result.scalars().all()}

                for item in reservation.items:
                    pharm = pharm_stocks.get(item.product_id)
                    if pharm:
                        pharm.quantity = max(0, pharm.quantity - item.quantity)

            # 5. Manually clean up invoice-related records (no cascade on Invoice relation)
            if invoice:
                # Delete payments (no cascade from Invoice → Payment by default)
                payments_result = await db.execute(
                    select(Payment).where(Payment.invoice_id == invoice.id)
                )
                for payment in payments_result.scalars().all():
                    await db.delete(payment)

                # Delete unassigned sales
                unassigned_result = await db.execute(
                    select(UnassignedSale).where(UnassignedSale.invoice_id == invoice.id)
                )
                for us in unassigned_result.scalars().all():
                    await db.delete(us)

                await db.delete(invoice)

            # 6. Delete reservation (items cascade via "all, delete-orphan")
            await db.delete(reservation)
            await db.commit()
            return True

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"cancel_reservation failed for id {reservation_id}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Deletion error: {str(e)}")
