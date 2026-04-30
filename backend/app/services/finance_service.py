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
                
                # Update Paid Amount (with overpayment handling)
                initial_payment_amount = obj_in.amount
                remaining_payment = obj_in.amount
                
                # First, pay THIS invoice up to 100%
                to_apply_this = min(remaining_payment, invoice.total_amount - invoice.paid_amount)
                invoice.paid_amount += to_apply_this
                remaining_payment -= to_apply_this
                
                if invoice.paid_amount >= invoice.total_amount:
                    invoice.status = InvoiceStatus.PAID
                else:
                    invoice.status = InvoiceStatus.PARTIAL
                
                # 2. Create Payment Record (Postupleniya) for THIS invoice portion only
                # The remaining portion will create other Payment records linked via source_payment_id
                payment = Payment(
                    invoice_id=invoice.id,
                    amount=to_apply_this,
                    payment_type=obj_in.payment_type,
                    processed_by_id=processor_id,
                    comment=obj_in.comment
                )
                db.add(payment)
                await db.flush() 
                
                # 3. Update UnassignedSale paid quantities (Pro-rata logic) and MedRep Bonus
                # We calculate what percentage of the invoice is now paid by THIS specific payment
                payment_ratio = obj_in.amount / invoice.total_amount if invoice.total_amount > 0 else 0
                total_paid_ratio = min(1.0, invoice.paid_amount / invoice.total_amount)
                
                from app.models.sales import UnassignedSale, Reservation, ReservationItem
                from app.models.product import Product
                from sqlalchemy.orm import selectinload
                
                # Fetch reservation to identify the target MedRep (assigned to pharmacy)
                from app.models.crm import MedicalOrganization
                from app.models.user import UserRole, User
                res_query = select(Reservation).options(
                    selectinload(Reservation.items),
                    selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps)
                ).where(Reservation.id == invoice.reservation_id)
                res_result = await db.execute(res_query)
                reservation = res_result.scalar_one_or_none()
                
                if reservation:
                    # Determine target user for bonus (MedRep assigned to Pharmacy)
                    target_medrep_id = None
                    if reservation.med_org and reservation.med_org.assigned_reps:
                        for rep in reservation.med_org.assigned_reps:
                            if rep.role == UserRole.MED_REP:
                                target_medrep_id = rep.id
                                break
                    
                    # Calculate bonus and salary for this specific payment
                    payment_bonus_amount = 0.0
                    payment_salary_total = 0.0
                    
                    for item in reservation.items:
                        # 1. Marketing bonus
                        if item.marketing_amount:
                            payment_bonus_amount += (item.quantity * item.marketing_amount) * payment_ratio
                        # 2. Salary (Zarplata)
                        if reservation.is_salary_enabled and item.salary_amount:
                            payment_salary_total += (item.quantity * item.salary_amount) * payment_ratio
                    
                    # Round to nearest integer to avoid fractions ("kopeyki")
                    payment_bonus_amount = float(round(payment_bonus_amount))
                    payment_salary_total = float(round(payment_salary_total))
                    
                    if target_medrep_id:
                        now = datetime.utcnow()
                        # Accrue bonus
                        if payment_bonus_amount > 0:
                            accrual_bonus = BonusLedger(
                                user_id=target_medrep_id,
                                amount=payment_bonus_amount,
                                ledger_type=LedgerType.ACCRUAL,
                                ledger_category="bonus",
                                payment_id=payment.id,
                                target_month=now.month,
                                target_year=now.year,
                                notes=f"Бонус начислен по счет-фактуре #{invoice.id} (Аптека: {reservation.med_org.name if reservation.med_org else 'N/A'})"
                            )
                            db.add(accrual_bonus)
                        
                        # Accrue salary
                        if payment_salary_total > 0:
                            accrual_salary = BonusLedger(
                                user_id=target_medrep_id,
                                amount=payment_salary_total,
                                ledger_type=LedgerType.ACCRUAL,
                                ledger_category="salary",
                                payment_id=payment.id,
                                target_month=now.month,
                                target_year=now.year,
                                notes=f"Зарплата начислена по счет-фактуре #{invoice.id} (Аптека: {reservation.med_org.name if reservation.med_org else 'N/A'})"
                            )
                            db.add(accrual_salary)

                unassigned_query = select(UnassignedSale).where(UnassignedSale.invoice_id == invoice.id)
                unassigned_result = await db.execute(unassigned_query)
                unassigned_records = unassigned_result.scalars().all()
                
                for rec in unassigned_records:
                    # New paid quantity based on total paid ratio
                    new_paid_qty = int(rec.total_quantity * total_paid_ratio)
                    rec.paid_quantity = new_paid_qty
                
                # 4. Decrement Pharmacy Stock on 100% payment (Ostatki Aptek) and Calculate Promo Balance
                if invoice.status == InvoiceStatus.PAID:
                    from app.models.crm import MedicalOrganizationStock
                    from app.models.sales import Reservation, ReservationItem
                    from sqlalchemy.orm import selectinload
                    
                    # Fetch reservation items to know what to decrement and calculate promo
                    res_query = select(Reservation).options(
                        selectinload(Reservation.items).selectinload(ReservationItem.product)
                    ).where(Reservation.id == invoice.reservation_id)
                    res_result = await db.execute(res_query)
                    reservation = res_result.scalar_one_or_none()
                    
                    if reservation:
                        total_promo = 0.0
                        for item in reservation.items:
                            # Decrement pharmacy stock
                            stk_query = select(MedicalOrganizationStock).where(
                                (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                                (MedicalOrganizationStock.product_id == item.product_id)
                            ).with_for_update()
                            stk_result = await db.execute(stk_query)
                            pharm_stock = stk_result.scalar_one_or_none()
                            
                            if pharm_stock:
                                 pharm_stock.quantity = max(0, pharm_stock.quantity - item.quantity)
                            
                            # Calculate promo
                            if reservation.is_bonus_eligible:
                                marketing_expense = item.marketing_amount or 0
                                total_promo += item.quantity * marketing_expense
                        
                        # Set initial promo balance for tovar_skidka
                        invoice.promo_balance = total_promo
                
                # 5. Overpayment Distribution Logic
                if remaining_payment > 0 and reservation and reservation.med_org_id:
                    # Find other unpaid invoices for this company
                    from app.models.sales import Invoice as InvoiceModel
                    other_inv_query = select(InvoiceModel).join(
                        Reservation, InvoiceModel.reservation_id == Reservation.id
                    ).where(
                        (Reservation.med_org_id == reservation.med_org_id) &
                        (InvoiceModel.id != invoice.id) &
                        (InvoiceModel.status != InvoiceStatus.PAID)
                    ).order_by(InvoiceModel.date.asc()).with_for_update()
                    
                    other_inv_result = await db.execute(other_inv_query)
                    other_invoices = other_inv_result.scalars().all()
                    
                    for other_inv in other_invoices:
                        if remaining_payment <= 0:
                            break
                        
                        apply_other = min(remaining_payment, other_inv.total_amount - other_inv.paid_amount)
                        other_inv.paid_amount += apply_other
                        remaining_payment -= apply_other
                        
                        if other_inv.paid_amount >= other_inv.total_amount:
                            other_inv.status = InvoiceStatus.PAID
                        else:
                            other_inv.status = InvoiceStatus.PARTIAL
                            
                        # Create payment record for other invoice, linked to the source payment
                        other_payment = Payment(
                            invoice_id=other_inv.id,
                            amount=apply_other,
                            payment_type=obj_in.payment_type,
                            processed_by_id=processor_id,
                            comment=f"Автоматическое погашение за счет переплаты по счёту №{invoice.factura_number or invoice.id}",
                            source_payment_id=payment.id
                        )
                        db.add(other_payment)
                    
                    # If still remaining, add to organization's credit balance
                    if remaining_payment > 0:
                        from app.models.crm import MedicalOrganization, BalanceTransaction, BalanceTransactionType
                        org_query = select(MedicalOrganization).where(MedicalOrganization.id == reservation.med_org_id).with_for_update()
                        org_result = await db.execute(org_query)
                        org = org_result.scalar_one_or_none()
                        if org:
                            org.credit_balance = (org.credit_balance or 0.0) + remaining_payment
                            
                            # Record BalanceTransaction
                            bt = BalanceTransaction(
                                organization_id=org.id,
                                amount=remaining_payment,
                                transaction_type=BalanceTransactionType.OVERPAYMENT,
                                related_invoice_id=invoice.id,
                                payment_id=payment.id,
                                comment=f"Переплата по счёту №{invoice.factura_number or invoice.id}"
                            )
                            db.add(bt)
                            # Note: we do NOT add remaining_payment to invoice.paid_amount here 
                            # to keep the invoice strictly at total_amount as requested.

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

                # 2. Assign exactly what was requested (No clipping/Cheklov yo'q)
                actual_assign_quantity = quantity

                # 2. Fetch product for marketing_expense and exact discounted price from reservation item
                from app.models.sales import Invoice, Reservation, ReservationItem
                prod_query = select(Product).where(Product.id == rec.product_id)
                prod_result = await db.execute(prod_query)
                product = prod_result.scalar_one()

                item_query = select(ReservationItem).join(
                    Reservation, ReservationItem.reservation_id == Reservation.id
                ).join(
                    Invoice, Invoice.reservation_id == Reservation.id
                ).where(
                    Invoice.id == rec.invoice_id,
                    ReservationItem.product_id == rec.product_id
                )
                item_result = await db.execute(item_query)
                reservation_item = item_result.scalar_one_or_none()
                
                # Calculate the exact price from invoice (price * (1 - discount% / 100))
                if reservation_item:
                    exact_price = reservation_item.price * (1 - (reservation_item.discount_percent or 0) / 100.0)
                else:
                    # Fallback if somehow not found (shouldn't happen)
                    exact_price = product.price
                    
                fact_amount = exact_price * quantity

                # 3. Create Fact Assignment
                now = datetime.utcnow()
                fact = DoctorFactAssignment(
                    med_rep_id=med_rep_id,
                    doctor_id=doctor_id,
                    product_id=rec.product_id,
                    quantity=actual_assign_quantity,
                    amount=fact_amount,
                    month=now.month,
                    year=now.year
                )
                db.add(fact)
                await db.flush()

                # 4. Create Bonus Ledger (Pro-rata bonus realization)
                # Round to nearest integer to avoid fractions ("kopeyki")
                bonus_amount = float(round(actual_assign_quantity * (reservation_item.marketing_amount or 0)))
                accrual = BonusLedger(
                    doctor_id=doctor_id,
                    amount=bonus_amount,
                    ledger_type=LedgerType.ACCRUAL,
                    fact_id=fact.id,
                    payment_id=None, # This is an assignment, not a direct payment record
                    notes=f"Бонус распределен из счет-фактуры #{rec.invoice_id} ({actual_assign_quantity} шт.)"
                )
                db.add(accrual)

                # 5. Update Record
                rec.assigned_quantity += actual_assign_quantity
                
                await db.commit()
                return fact
            except HTTPException:
                await transaction.rollback()
                raise
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Assignment failed: {str(e)}")

    @staticmethod
    async def get_medrep_bonus_balance(db: AsyncSession, med_rep_id: int, category: str = "bonus") -> float:
        """
        Calculate total usable bonus balance for a med rep by category.
        = Sum of PAID Accruals (is_paid=True) - Sum of Offsets
        """
        from app.models.ledger import BonusLedger, LedgerType

        # Get all credits (earned bonuses that are PAID) and debits (spending)
        query = select(BonusLedger).where(
            BonusLedger.user_id == med_rep_id,
            BonusLedger.ledger_type.in_([LedgerType.ACCRUAL, LedgerType.OFFSET]),
            BonusLedger.ledger_category == category
        )
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        balance = 0.0
        for entry in entries:
            # We only count ACCRUALs if they have been physically paid by the director
            if entry.ledger_type == LedgerType.ACCRUAL:
                if entry.is_paid:
                    balance += entry.amount
            elif entry.ledger_type == LedgerType.OFFSET:
                balance -= entry.amount
                
        return balance

    @staticmethod
    async def allocate_bonus(db: AsyncSession, med_rep_id: int, doctor_id: int, product_id: int, quantity: int, target_month: int, target_year: int, amount_per_unit: float = None, notes: str = None):
        """
        MedRep allocates bonus to a doctor based on a product quantity (units × marketing_expense).
        Triggers:
        1. DoctorFactAssignment - records the fact that the doctor sold N units this month
        2. Debit MedRep balance (OFFSET ledger)
        3. Credit Doctor balance (ACCRUAL ledger) - visible in doctor's paid bonuses
        """
        from app.models.ledger import BonusLedger, LedgerType
        from app.models.crm import Doctor
        from app.models.product import Product
        from app.models.sales import Plan, DoctorFactAssignment

        async with db.begin_nested() as transaction:
            try:
                # 1. Validate doctor exists
                doc_result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
                doctor = doc_result.scalar_one_or_none()
                if not doctor:
                    raise HTTPException(status_code=404, detail="Врач не найден")

                # 2. Validate product and get marketing_expense
                prod_result = await db.execute(select(Product).where(Product.id == product_id))
                product = prod_result.scalar_one_or_none()
                if not product:
                    raise HTTPException(status_code=404, detail="Продукт не найден")

                marketing_expense = amount_per_unit if amount_per_unit is not None else (product.marketing_expense or 0)
                if marketing_expense <= 0 and amount_per_unit is None:
                    raise HTTPException(status_code=400, detail=f"У продукта '{product.name}' не задан расход на маркетинг")

                # 3. Compute the bonus amount
                # Round to nearest integer to avoid fractions ("kopeyki")
                amount = float(round(quantity * marketing_expense))

                # 4. Check MedRep balance
                current_balance = await FinancialService.get_medrep_bonus_balance(db, med_rep_id)
                if amount > current_balance:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Недостаточно средств. Требуется: {amount:,.0f} UZS, баланс: {current_balance:,.0f} UZS"
                    )

                # 5. Create DoctorFactAssignment (record of units sold to doctor in this period)
                fact = DoctorFactAssignment(
                    med_rep_id=med_rep_id,
                    doctor_id=doctor_id,
                    product_id=product_id,
                    quantity=quantity,
                    month=target_month,
                    year=target_year
                )
                db.add(fact)
                await db.flush()

                product_name = f" ({product.name})"

                # 6. Debit MedRep balance (OFFSET)
                medrep_offset = BonusLedger(
                    user_id=med_rep_id,
                    product_id=product_id,
                    amount=amount,
                    ledger_type=LedgerType.OFFSET,
                    target_month=target_month,
                    target_year=target_year,
                    doctor_id=doctor_id,
                    fact_id=fact.id,
                    notes=notes or f"Бонус выплачен врачу {doctor.full_name}{product_name} ({quantity} шт.)"
                )
                db.add(medrep_offset)

                # 7. Credit Doctor balance (ACCRUAL) - shows up in doctor's bonus history
                doctor_accrual = BonusLedger(
                    doctor_id=doctor_id,
                    product_id=product_id,
                    amount=amount,
                    ledger_type=LedgerType.ACCRUAL,
                    target_month=target_month,
                    target_year=target_year,
                    fact_id=fact.id,
                    notes=notes or f"Бонус от медпреда за {quantity} шт.{product_name}"
                )
                db.add(doctor_accrual)

                # 8. Create BonusPayment record - visible in "Выплаченные бонусы" UI section
                from app.models.sales import BonusPayment
                from datetime import date
                bonus_payment = BonusPayment(
                    med_rep_id=med_rep_id,
                    doctor_id=doctor_id,
                    product_id=product_id,
                    amount=amount,
                    for_month=target_month,
                    for_year=target_year,
                    paid_date=date.today(),
                    notes=notes or f"Выплата за {quantity} шт.{product_name}"
                )
                db.add(bonus_payment)

                await db.commit()
                return {
                    "message": "Бонус успешно прикреплён",
                    "amount": amount,
                    "quantity": quantity,
                    "product": product.name
                }

            except HTTPException:
                await transaction.rollback()
                raise
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Ошибка при распределении: {str(e)}")

    @staticmethod
    async def delete_doctor_fact_assignment(db: AsyncSession, id: int, id_type: str = "fact"):
        """
        Deletes a fact assignment and reverses all related ledger and payment entries.
        Supports both direct Fact ID and Ledger ID (from history).
        """
        from app.models.sales import DoctorFactAssignment
        from app.models.ledger import BonusLedger, LedgerType

        fact = None
        
        # 1. Resolve the fact
        if id_type == "fact":
            fact = await db.get(DoctorFactAssignment, id)
        elif id_type == "ledger":
            ledger = await db.get(BonusLedger, id)
            if ledger:
                if ledger.fact_id:
                    fact = await db.get(DoctorFactAssignment, ledger.fact_id)
                else:
                    # Fallback for OLD records: find fact by matching metadata (id_type=ledger)
                    stmt_match = select(DoctorFactAssignment).where(
                        DoctorFactAssignment.med_rep_id == ledger.user_id,
                        DoctorFactAssignment.doctor_id == ledger.doctor_id,
                        DoctorFactAssignment.product_id == ledger.product_id,
                        DoctorFactAssignment.month == ledger.target_month,
                        DoctorFactAssignment.year == ledger.target_year
                    ).limit(1)
                    res_match = await db.execute(stmt_match)
                    fact = res_match.scalar_one_or_none()
        
        if not fact:
            raise HTTPException(status_code=404, detail="Фakt topilmadi (O'chirish imkonsiz)")

        fact_id = fact.id

        # 2. Delete related BonusLedger entries
        # Priority 1: Direct link via fact_id
        stmt_ledger = select(BonusLedger).where(BonusLedger.fact_id == fact_id)
        ledger_res = await db.execute(stmt_ledger)
        ledger_entries = ledger_res.scalars().all()
        for entry in ledger_entries:
            await db.delete(entry)

        # 3. Priority 2: Fallback by metadata (for old records)
        # Avoid deleting EVERYTHING if multiple assignments exist (e.g. 1+1 scenario)
        if not ledger_entries:
            # We look for one ACCRUAL and one OFFSET for this specific assignment
            # We match the specific medical rep to ensure we don't touch others' bonuses
            
            # Find one OFFSET
            stmt_offset = select(BonusLedger).where(
                BonusLedger.user_id == fact.med_rep_id,
                BonusLedger.doctor_id == fact.doctor_id,
                BonusLedger.product_id == fact.product_id,
                BonusLedger.target_month == fact.month,
                BonusLedger.target_year == fact.year,
                BonusLedger.ledger_type == LedgerType.OFFSET
            ).limit(1)
            offset_res = await db.execute(stmt_offset)
            offset_entry = offset_res.scalar_one_or_none()
            if offset_entry:
                await db.delete(offset_entry)

            # Find one ACCRUAL (the doctor's credit)
            stmt_accrual = select(BonusLedger).where(
                BonusLedger.doctor_id == fact.doctor_id,
                BonusLedger.product_id == fact.product_id,
                BonusLedger.target_month == fact.month,
                BonusLedger.target_year == fact.year,
                BonusLedger.ledger_type == LedgerType.ACCRUAL
            ).limit(1)
            accrual_res = await db.execute(stmt_accrual)
            accrual_entry = accrual_res.scalar_one_or_none()
            if accrual_entry:
                await db.delete(accrual_entry)

        # 4. Delete related BonusPayment entries
        from app.models.sales import BonusPayment
        stmt_payment = select(BonusPayment).where(
            BonusPayment.med_rep_id == fact.med_rep_id,
            BonusPayment.doctor_id == fact.doctor_id,
            BonusPayment.product_id == fact.product_id,
            BonusPayment.for_month == fact.month,
            BonusPayment.for_year == fact.year
        ).limit(1) # Also limit to 1 per fact
        payment_res = await db.execute(stmt_payment)
        pmt = payment_res.scalar_one_or_none()
        if pmt:
            await db.delete(pmt)

        # 5. Delete the fact itself
        await db.delete(fact)

        await db.commit()
        return {"status": "success", "message": "Фakt o'chirildi"}

    @staticmethod
    async def reverse_payment(db: AsyncSession, payment_id: int):
        """
        Reverses a payment:
        1. Deducts amount from Invoice.paid_amount
        2. Updates Invoice status
        3. Deletes related BonusLedger accruals
        4. Adjusts UnassignedSale quantities
        5. Reverses stock decrement (Ostatki Aptek) if fully paid -> partial/unpaid
        6. Reverses overpayments (BalanceTransaction & credit_balance)
        7. Deletes the Payment record
        """
        async with db.begin_nested() as transaction:
            try:
                from app.models.sales import Payment, Invoice, InvoiceStatus, Reservation, ReservationItem, UnassignedSale
                from sqlalchemy.orm import selectinload
                from app.models.ledger import BonusLedger
                from app.models.crm import MedicalOrganization, BalanceTransaction, MedicalOrganizationStock
                
                # 1. Fetch main Payment
                stmt = select(Payment).options(
                    selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.items)
                ).where(Payment.id == payment_id).with_for_update()
                
                res = await db.execute(stmt)
                main_payment = res.scalar_one_or_none()
                
                if not main_payment:
                    raise HTTPException(status_code=404, detail="Payment not found")
                
                # RECURSIVE REVERSAL LOGIC
                # A. Find and reverse all CHILD payments (automatic settlements from overpayment)
                child_stmt = select(Payment).options(
                    selectinload(Payment.invoice)
                ).where(Payment.source_payment_id == payment_id)
                child_res = await db.execute(child_stmt)
                child_payments = child_res.scalars().all()
                
                all_payments_to_reverse = [main_payment] + list(child_payments)

                for pmt in all_payments_to_reverse:
                    inv = pmt.invoice
                    if inv:
                        prev_status = inv.status
                        # 1. Deduct amount
                        inv.paid_amount = max(0.0, float(inv.paid_amount) - float(pmt.amount))
                        
                        # 2. Update status
                        if inv.paid_amount <= 0:
                            inv.status = InvoiceStatus.UNPAID
                        elif inv.paid_amount < inv.total_amount:
                            inv.status = InvoiceStatus.PARTIAL
                        else:
                            inv.status = InvoiceStatus.PAID
                        
                        # 3. Reverse Stock if needed
                        if prev_status == InvoiceStatus.PAID and inv.status != InvoiceStatus.PAID:
                            reservation = inv.reservation # Loaded in main_payment, but might need load for children
                            # For child payments, usually reservation is NOT loaded in this query. 
                            # Let's ensure it for safety if we want full reversal including stock.
                            # BUT child payments usually don't trigger stock decrement unless they complete a 100% payment.
                            # If they do, we handle it:
                            await db.refresh(inv, ["reservation"])
                            if inv.reservation:
                                for item in inv.reservation.items:
                                    stk_q = select(MedicalOrganizationStock).where(
                                        (MedicalOrganizationStock.med_org_id == inv.reservation.med_org_id) &
                                        (MedicalOrganizationStock.product_id == item.product_id)
                                    ).with_for_update()
                                    stk_r = await db.execute(stk_q)
                                    stk = stk_r.scalar_one_or_none()
                                    if stk:
                                        stk.quantity += item.quantity
                                inv.promo_balance = 0.0

                        # 4. Update UnassignedSale
                        ratio = min(1.0, inv.paid_amount / inv.total_amount) if inv.total_amount > 0 else 0
                        u_query = select(UnassignedSale).where(UnassignedSale.invoice_id == inv.id)
                        u_res = await db.execute(u_query)
                        for u_rec in u_res.scalars().all():
                            u_rec.paid_quantity = int(u_rec.total_quantity * ratio)

                    # 5. Reverse BonusLedger for this specific payment record
                    l_stmt = select(BonusLedger).where(BonusLedger.payment_id == pmt.id)
                    l_res = await db.execute(l_stmt)
                    for entry in l_res.scalars().all():
                        await db.delete(entry)

                    # 6. Delete the payment record (Child or Main)
                    if pmt.id != main_payment.id:
                        await db.delete(pmt)

                # B. Find and reverse all related BalanceTransactions (Overpayments)
                bt_query = select(BalanceTransaction).where(BalanceTransaction.payment_id == payment_id)
                bt_res = await db.execute(bt_query)
                for bt in bt_res.scalars().all():
                    org_q = select(MedicalOrganization).where(MedicalOrganization.id == bt.organization_id).with_for_update()
                    org_r = await db.execute(org_q)
                    org = org_r.scalar_one_or_none()
                    if org:
                        org.credit_balance = max(0.0, (org.credit_balance or 0.0) - bt.amount)
                    await db.delete(bt)

                # C. Finally delete the main payment
                await db.delete(main_payment)
                await db.flush()

                # D. Recalculate paid_amount for ALL affected invoices directly from DB
                # This guarantees 100% accuracy regardless of rounding or logic bugs
                affected_invoice_ids = {pmt.invoice_id for pmt in all_payments_to_reverse if pmt.invoice_id}
                for inv_id in affected_invoice_ids:
                    real_paid_q = select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv_id)
                    real_paid = (await db.execute(real_paid_q)).scalar() or 0.0
                    inv_q = select(Invoice).where(Invoice.id == inv_id)
                    inv_obj = (await db.execute(inv_q)).scalar_one_or_none()
                    if inv_obj:
                        inv_obj.paid_amount = real_paid
                        if real_paid <= 0:
                            inv_obj.status = InvoiceStatus.UNPAID
                        elif real_paid < inv_obj.total_amount:
                            inv_obj.status = InvoiceStatus.PARTIAL
                        else:
                            inv_obj.status = InvoiceStatus.PAID

                await db.commit()
                return {"status": "success", "message": f"Payment #{payment_id} and all linked transactions reversed successfully"}
                
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")

    @staticmethod
    async def reverse_balance_transaction(db: AsyncSession, transaction_id: int):
        """
        Reverses a balance transaction (e.g. manual top-up, overpayment, or application).
        If the transaction is tied to a Payment, it reverses the parent Payment.
        Otherwise, it adjusts the MedicalOrganization.credit_balance directly.
        """
        from app.models.crm import BalanceTransaction, MedicalOrganization, BalanceTransactionType
        from app.models.sales import Payment
        from sqlalchemy import select

        async with db.begin_nested() as transaction:
            try:
                # 1. Fetch the transaction
                stmt = select(BalanceTransaction).where(BalanceTransaction.id == transaction_id).with_for_update()
                res = await db.execute(stmt)
                bt = res.scalar_one_or_none()
                
                if not bt:
                    raise HTTPException(status_code=404, detail="Transaction not found")
                
                # 2. Handle based on type
                if bt.transaction_type in [BalanceTransactionType.APPLICATION, BalanceTransactionType.OVERPAYMENT]:
                    # These are tied to a Payment. Reversing the Payment handles everything.
                    if bt.payment_id:
                        # Recursively call reverse_payment (but within this transaction boundary if possible, 
                        # though reverse_payment also has its own transaction management).
                        # To keep it simple, we'll call it and it will commit/rollback on its own.
                        return await FinancialService.reverse_payment(db, bt.payment_id)
                    else:
                        # Fallback for orphaned application (should not happen)
                        await db.delete(bt)
                
                elif bt.transaction_type == BalanceTransactionType.TOPUP or bt.transaction_type == BalanceTransactionType.MANUAL_ADJUSTMENT:
                    # Find all APPLICATION child transactions linked to this TOPUP's payment
                    # These are Payments auto-generated when the topup was applied to invoices
                    from app.models.sales import Invoice, InvoiceStatus
                    
                    # Find child APPLICATION balance transactions that came from this topup's payment
                    child_bt_stmt = select(BalanceTransaction).where(
                        (BalanceTransaction.organization_id == bt.organization_id) &
                        (BalanceTransaction.transaction_type == BalanceTransactionType.APPLICATION) &
                        (BalanceTransaction.payment_id.isnot(None))
                    ).order_by(BalanceTransaction.id.desc())
                    child_bts = (await db.execute(child_bt_stmt)).scalars().all()
                    
                    # Collect unique payment_ids to reverse from child applications
                    payment_ids_to_reverse = set()
                    for child_bt in child_bts:
                        if child_bt.payment_id:
                            # Check if this payment was created as part of this topup (same date window)
                            pay_stmt = select(Payment).where(Payment.id == child_bt.payment_id)
                            pay = (await db.execute(pay_stmt)).scalar_one_or_none()
                            if pay and pay.source_payment_id is None:
                                # Only direct payments (not already child payments)
                                payment_ids_to_reverse.add(child_bt.payment_id)

                    # Reverse each application payment: reduce invoice paid_amount
                    affected_invoice_ids = set()
                    for pay_id in payment_ids_to_reverse:
                        pay_stmt = select(Payment).where(Payment.id == pay_id)
                        pay = (await db.execute(pay_stmt)).scalar_one_or_none()
                        if pay and pay.invoice_id:
                            affected_invoice_ids.add(pay.invoice_id)
                            # Delete child balance transactions for this payment
                            child_del_stmt = select(BalanceTransaction).where(BalanceTransaction.payment_id == pay_id)
                            for c in (await db.execute(child_del_stmt)).scalars().all():
                                await db.delete(c)
                            await db.delete(pay)

                    await db.flush()

                    # Recalculate paid_amount for all affected invoices from real DB payments
                    from sqlalchemy import func as sqlfunc
                    for inv_id in affected_invoice_ids:
                        real_paid = (await db.execute(
                            select(sqlfunc.coalesce(sqlfunc.sum(Payment.amount), 0.0)).where(Payment.invoice_id == inv_id)
                        )).scalar() or 0.0
                        inv_obj = (await db.execute(select(Invoice).where(Invoice.id == inv_id))).scalar_one_or_none()
                        if inv_obj:
                            inv_obj.paid_amount = real_paid
                            if real_paid <= 0:
                                inv_obj.status = InvoiceStatus.UNPAID
                            elif real_paid < inv_obj.total_amount:
                                inv_obj.status = InvoiceStatus.PARTIAL
                            else:
                                inv_obj.status = InvoiceStatus.PAID

                    # Now adjust credit_balance and delete the topup transaction
                    org_stmt = select(MedicalOrganization).where(MedicalOrganization.id == bt.organization_id).with_for_update()
                    org = (await db.execute(org_stmt)).scalar_one_or_none()
                    if org:
                        org.credit_balance = max(0.0, (org.credit_balance or 0.0) - bt.amount)
                    await db.delete(bt)

                else:
                    # Unhandled types or INVOICE debt type (which usually shouldn't be reversed this way)
                    await db.delete(bt)
                
                await db.commit()
                return {"status": "success", "message": f"Transaction #{transaction_id} reversed successfully"}

            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")

