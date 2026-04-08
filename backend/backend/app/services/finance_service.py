from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from datetime import datetime
import logging

from app.models.sales import (
    Invoice, Payment, InvoiceStatus, PaymentType, BalanceTopUp, Reservation
)
from app.models.crm import MedicalOrganization

logger = logging.getLogger(__name__)

class FinanceService:
    @staticmethod
    async def settle_debt_fifo(db: AsyncSession, med_org_id: int, amount: float, top_up_id: Optional[int] = None, processed_by_id: Optional[int] = None):
        """
        Settles organization debt using FIFO (First In First Out) method based on realization_date/date.
        Used when a balance is topped up or an overpayment occurs.
        """
        if amount <= 0:
            return amount

        # 1. Fetch all unpaid/partial invoices for this organization, sorted by date (oldest first)
        query = (
            select(Invoice)
            .join(Reservation, Invoice.reservation_id == Reservation.id)
            .where(
                and_(
                    Reservation.med_org_id == med_org_id,
                    Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.APPROVED, InvoiceStatus.DRAFT]),
                    Invoice.total_amount > Invoice.paid_amount
                )
            )
            .order_by(Invoice.realization_date.asc(), Invoice.date.asc())
            .with_for_update() # Lock for update to prevent race conditions
        )
        
        result = await db.execute(query)
        invoices = result.scalars().all()
        
        remaining_top_up = amount
        settled_count = 0
        
        for inv in invoices:
            if remaining_top_up <= 0:
                break
            
            debt = inv.total_amount - inv.paid_amount
            if debt <= 0:
                continue
            
            payment_amount = min(remaining_top_up, debt)
            payment_amount = round(payment_amount) # UZS Rounding
            
            if payment_amount <= 0:
                continue

            # Update Invoice
            inv.paid_amount += payment_amount
            if inv.paid_amount >= inv.total_amount:
                inv.status = InvoiceStatus.PAID
            else:
                inv.status = InvoiceStatus.PARTIAL
            
            # Create automated Payment record
            comment = f"Оплачено через баланс"
            if top_up_id:
                comment += f" (Пополнение #{top_up_id})"
            
            payment = Payment(
                invoice_id=inv.id,
                med_org_id=med_org_id,
                top_up_id=top_up_id,
                amount=payment_amount,
                payment_type=PaymentType.OTHER,
                processed_by_id=processed_by_id,
                comment=comment,
                date=datetime.utcnow()
            )
            db.add(payment)
            
            remaining_top_up -= payment_amount
            settled_count += 1
            
        logger.info(f"FIFO Settlement for MedOrg #{med_org_id}: Settled {settled_count} invoices. Remaining top-up: {remaining_top_up}")
        return remaining_top_up

    @staticmethod
    async def top_up_balance(db: AsyncSession, med_org_id: int, amount: float, comment: str, processed_by_id: int, top_up_date: Optional[datetime] = None):
        """
        Manually tops up an organization's balance and triggers FIFO settlement if negative.
        """
        # 1. Create Top-up record (Audit)
        top_up = BalanceTopUp(
            med_org_id=med_org_id,
            amount=amount,
            comment=comment,
            processed_by_id=processed_by_id,
            date=top_up_date or datetime.utcnow()
        )
        db.add(top_up)
        await db.flush() # Get ID
        
        # 2. Update MedicalOrganization Balance
        result = await db.execute(select(MedicalOrganization).where(MedicalOrganization.id == med_org_id).with_for_update())
        med_org = result.scalar_one_or_none()
        if not med_org:
            raise ValueError(f"Organization #{med_org_id} not found")
            
        med_org.credit_balance = (med_org.credit_balance or 0.0) + amount
        
        # 3. If organization has debt, triggered FIFO settlement
        # We handle this by passing the full top-up amount to the FIFO settle function.
        # But wait, the user said: "if balance was negative, top-up fills it... if still negative, keep it... if positive, add it".
        # Actually, our settle_debt_fifo should only use what was just added if there's debt.
        
        # Correct logic: Use the top-up amount to close existing debts.
        await FinanceService.settle_debt_fifo(
            db, 
            med_org_id=med_org_id, 
            amount=amount, 
            top_up_id=top_up.id, 
            processed_by_id=processed_by_id
        )
        
        await db.commit()
        await db.refresh(top_up)
        return top_up

    @staticmethod
    async def sync_balance_on_invoice(db: AsyncSession, invoice_id: int):
        """
        Updates organization balance when an invoice is created/deleted/modified.
        Invoice Creation -> Balance decreases (debt increases).
        """
        query = select(Invoice).options(selectinload(Invoice.reservation)).where(Invoice.id == invoice_id)
        res = await db.execute(query)
        invoice = res.scalar_one_or_none()
        if not invoice or not invoice.reservation or not invoice.reservation.med_org_id:
            return

        med_org_id = invoice.reservation.med_org_id
        # Note: Usually we don't subtract full total_amount immediately IF we want the balance to reflect NET position.
        # User said: "koroxna balansi 0 va u 500 000 so'mlik faktura bilan tovar olsa balans avtomatik -500000"
        # This implies we subtract total_amount.
        
        result = await db.execute(select(MedicalOrganization).where(MedicalOrganization.id == med_org_id).with_for_update())
        med_org = result.scalar_one_or_none()
        if med_org:
            med_org.credit_balance = (med_org.credit_balance or 0.0) - invoice.total_amount
            await db.commit()
