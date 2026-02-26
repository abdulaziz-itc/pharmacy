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
                
                # 2. Create Payment Record
                payment = Payment(
                    invoice_id=invoice.id,
                    amount=obj_in.amount,
                    payment_type=obj_in.payment_type,
                    processed_by_id=processor_id,
                    allocated_doctor_id=obj_in.allocated_doctor_id # Can be null if MedRep hasn't allocated yet
                )
                db.add(payment)
                await db.flush() # Need payment ID for Ledger
                
                # 3. Calculate Bonus & Stats (Pro-rata or Item-level logic)
                # For simplicity in this demo, we assume the payment applies proportionally
                # or triggers stats. If it's fully paid, we process all items.
                # In production, specific items from an invoice might be mapped.
                
                if invoice.status == InvoiceStatus.PAID and obj_in.allocated_doctor_id:
                    # Fetch reservation items to calculate bonus
                    items_query = select(ReservationItem, Product.marketing_expense).join(Product).where(
                        ReservationItem.reservation_id == invoice.reservation_id
                    )
                    items_result = await db.execute(items_query)
                    items = items_result.all()
                    
                    month = datetime.utcnow().month
                    year = datetime.utcnow().year
                    
                    for item, marketing_expense in items:
                        # 3a. Update Real-Time Counter
                        stat_query = select(DoctorMonthlyStat).where(
                            (DoctorMonthlyStat.doctor_id == obj_in.allocated_doctor_id) &
                            (DoctorMonthlyStat.product_id == item.product_id) &
                            (DoctorMonthlyStat.month == month) &
                            (DoctorMonthlyStat.year == year)
                        )
                        stat_res = await db.execute(stat_query)
                        stat = stat_res.scalar_one_or_none()
                        
                        earned_bonus = item.quantity * marketing_expense
                        
                        if stat:
                            stat.paid_quantity += item.quantity
                            stat.paid_amount += item.total_price
                            stat.bonus_amount += earned_bonus
                        else:
                            new_stat = DoctorMonthlyStat(
                                doctor_id=obj_in.allocated_doctor_id,
                                product_id=item.product_id,
                                month=month, year=year,
                                paid_quantity=item.quantity,
                                paid_amount=item.total_price,
                                bonus_amount=earned_bonus
                            )
                            db.add(new_stat)
                            
                        # 3b. Add to Bonus Ledger (Accrual)
                        accrual = BonusLedger(
                            doctor_id=obj_in.allocated_doctor_id,
                            amount=earned_bonus, # Positive
                            ledger_type=LedgerType.ACCRUAL,
                            invoice_item_id=item.id,
                            payment_id=payment.id,
                            notes=f"Bonus for product {item.product_id}"
                        )
                        db.add(accrual)
                
                await db.commit()
                return payment
                
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")
