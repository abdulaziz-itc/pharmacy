from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.models.sales import Payment, Invoice, InvoiceStatus, ReservationItem
from app.models.ledger import BonusLedger, LedgerType, DoctorMonthlyStat
from app.models.product import Product
from app.schemas.sales import PaymentCreate
from datetime import datetime

class FinancialService:
    @staticmethod
    async def process_payment(db: AsyncSession, obj_in: PaymentCreate, processor_id: int):
        """
        Postupleniya (Payment) processing Engine.
        Handles:
        1. Invoice payment status tracking (Partial/Paid)
        2. Plan fulfillment (Updates stats)
        3. Double-entry Bonus accrual
        """
        async with db.begin_nested() as transaction:
            try:
                # 1. Fetch Invoice
                invoice_query = select(Invoice).where(Invoice.id == obj_in.invoice_id).with_for_update()
                invoice_result = await db.execute(invoice_query)
                invoice = invoice_result.scalar_one_or_none()
                
                if not invoice:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                
                if invoice.status == InvoiceStatus.PAID:
                    raise HTTPException(status_code=400, detail="Invoice is already fully paid")
                
                # Update Paid Amount
                invoice.paid_amount += obj_in.amount
                
                if invoice.paid_amount >= invoice.total_amount:
                    invoice.status = InvoiceStatus.PAID
                else:
                    invoice.status = InvoiceStatus.PARTIAL
                
                # 2. Create Payment Record (Postupleniya)
                payment = Payment(
                    invoice_id=invoice.id,
                    amount=obj_in.amount,
                    payment_type=obj_in.payment_type,
                    processed_by_id=processor_id,
                    comment=obj_in.comment
                )
                db.add(payment)
                await db.flush() 
                
                # 3. Update UnassignedSale paid quantities (Pro-rata logic)
                # We calculate what percentage of the invoice is now paid
                total_paid_ratio = min(1.0, invoice.paid_amount / invoice.total_amount)
                
                from app.models.sales import UnassignedSale
                unassigned_query = select(UnassignedSale).where(UnassignedSale.invoice_id == invoice.id)
                unassigned_result = await db.execute(unassigned_query)
                unassigned_records = unassigned_result.scalars().all()
                
                for rec in unassigned_records:
                    # New paid quantity based on total paid ratio
                    new_paid_qty = int(rec.total_quantity * total_paid_ratio)
                    rec.paid_quantity = new_paid_qty
                
                # 4. Decrement Pharmacy Stock on 100% payment (Ostatki Aptek)
                if invoice.status == InvoiceStatus.PAID:
                    from app.models.crm import MedicalOrganizationStock
                    from app.models.sales import Reservation, ReservationItem
                    from sqlalchemy.orm import selectinload
                    
                    # Fetch reservation items to know what to decrement
                    res_query = select(Reservation).options(selectinload(Reservation.items)).where(Reservation.id == invoice.reservation_id)
                    res_result = await db.execute(res_query)
                    reservation = res_result.scalar_one_or_none()
                    
                    if reservation:
                        for item in reservation.items:
                            stk_query = select(MedicalOrganizationStock).where(
                                (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                                (MedicalOrganizationStock.product_id == item.product_id)
                            ).with_for_update()
                            stk_result = await db.execute(stk_query)
                            pharm_stock = stk_result.scalar_one_or_none()
                            
                            if pharm_stock:
                                pharm_stock.quantity = max(0, pharm_stock.quantity - item.quantity)
                
                await db.commit()
                return payment
                
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")

    @staticmethod
    async def assign_unassigned_sale(db: AsyncSession, med_rep_id: int, unassigned_id: int, doctor_id: int, quantity: int):
        """
        MedRep assigns a paid (but unassigned) product quantity to a specific doctor.
        Triggers:
        1. DoctorFactAssignment creation
        2. BonusLedger accrual
        """
        from app.models.sales import UnassignedSale, DoctorFactAssignment
        from app.models.ledger import BonusLedger, LedgerType
        from app.models.product import Product

        async with db.begin_nested() as transaction:
            try:
                # 1. Fetch unassigned record
                query = select(UnassignedSale).where(
                    (UnassignedSale.id == unassigned_id) & 
                    (UnassignedSale.med_rep_id == med_rep_id)
                ).with_for_update()
                result = await db.execute(query)
                rec = result.scalar_one_or_none()

                if not rec:
                    raise HTTPException(status_code=404, detail="Unassigned record not found or not owned by you")

                available = rec.paid_quantity - rec.assigned_quantity
                if quantity > available:
                    raise HTTPException(status_code=400, detail=f"Only {available} units available for assignment")

                # 2. Fetch product for marketing_expense
                prod_query = select(Product).where(Product.id == rec.product_id)
                prod_result = await db.execute(prod_query)
                product = prod_result.scalar_one()

                # 3. Create Fact Assignment
                now = datetime.utcnow()
                fact = DoctorFactAssignment(
                    med_rep_id=med_rep_id,
                    doctor_id=doctor_id,
                    product_id=rec.product_id,
                    quantity=quantity,
                    month=now.month,
                    year=now.year
                )
                db.add(fact)
                await db.flush()

                # 4. Create Bonus Ledger (Pro-rata bonus realization)
                bonus_amount = quantity * (product.marketing_expense or 0)
                accrual = BonusLedger(
                    doctor_id=doctor_id,
                    amount=bonus_amount,
                    ledger_type=LedgerType.ACCRUAL,
                    payment_id=None, # This is an assignment, not a direct payment record
                    notes=f"Bonus assigned from Invoice #{rec.invoice_id} ({quantity} units)"
                )
                db.add(accrual)

                # 5. Update Record
                rec.assigned_quantity += quantity
                
                await db.commit()
                return fact
            except HTTPException:
                await transaction.rollback()
                raise
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Assignment failed: {str(e)}")
