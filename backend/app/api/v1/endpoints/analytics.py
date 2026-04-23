from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, date
from sqlalchemy import Date, cast, select, func, and_, or_, case
from sqlalchemy.orm import selectinload
import calendar
import io
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from fastapi.responses import StreamingResponse
from app.api import deps
from app.models.user import User, UserRole
from app.models.sales import Payment, Invoice, Reservation, ReservationItem, InvoiceStatus, Plan, DoctorFactAssignment
from app.models.crm import BalanceTransaction, MedicalOrganization, Doctor
from app.models.ledger import BonusLedger, LedgerType, DoctorMonthlyStat
from app.models.finance import OtherExpense
from app.models.product import Product
from app.crud.crud_user import get_descendant_ids

router = APIRouter()

async def _get_receipt_totals(db: AsyncSession, start_date, end_date, rep_ids=None, region_ids=None, product_id=None):
    """
    Unified private helper to get Receipt totals (Payments + Topups) consistently.
    Called by Dashboard and Stats endpoints.
    """
    # Normalize inputs
    if rep_ids is not None and not isinstance(rep_ids, list): rep_ids = [rep_ids]
    if region_ids is not None and not isinstance(region_ids, list): region_ids = [region_ids]
    
    has_rep = rep_ids and len(rep_ids) > 0
    has_reg = region_ids and len(region_ids) > 0
    has_prod = product_id is not None
    
    # 1. Sum Invoice-linked payments
    if not has_rep and not has_reg and not has_prod:
        # Bare sum for absolute reliability in Global/Director view
        pay_sum_q = select(func.coalesce(func.sum(Payment.amount), 0.0)).select_from(Payment)
        pay_sum_q = pay_sum_q.where(or_(Payment.comment.is_(None), ~Payment.comment.ilike('%Автоматическое погашение%')))
        if start_date and end_date:
            pay_sum_q = pay_sum_q.where(and_(Payment.date >= start_date, Payment.date < end_date))
    else:
        pay_sum_q = select(func.coalesce(func.sum(Payment.amount), 0.0)).select_from(Payment).join(Invoice, Payment.invoice_id == Invoice.id)
        pay_sum_q = pay_sum_q.where(or_(Payment.comment.is_(None), ~Payment.comment.ilike('%Автоматическое погашение%')))
        if start_date and end_date:
            pay_sum_q = pay_sum_q.where(and_(Payment.date >= start_date, Payment.date < end_date))
        pay_sum_q = pay_sum_q.join(Reservation, Invoice.reservation_id == Reservation.id)
        pay_sum_q = pay_sum_q.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
        if has_rep:
            pay_sum_q = pay_sum_q.where(or_(Reservation.created_by_id.in_(rep_ids), MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))))
        if has_reg:
            pay_sum_q = pay_sum_q.where(MedicalOrganization.region_id.in_(region_ids))
        if has_prod:
            pay_sum_q = pay_sum_q.join(ReservationItem, Reservation.id == ReservationItem.reservation_id).where(ReservationItem.product_id == int(product_id))

    pay_sum = (await db.execute(pay_sum_q)).scalar() or 0.0
    
    # 2. Sum Standalone refills (Balance Transactions)
    top_sum = 0.0
    if not has_prod:
        top_sum_q = select(func.coalesce(func.sum(BalanceTransaction.amount), 0.0)).select_from(BalanceTransaction)
        # Relaxed types to be sure
        top_sum_q = top_sum_q.where(or_(
            func.lower(BalanceTransaction.transaction_type) == "topup",
            func.lower(BalanceTransaction.transaction_type) == "refill",
            func.lower(BalanceTransaction.transaction_type) == "balance",
            and_(func.lower(BalanceTransaction.transaction_type) == "adjustment", BalanceTransaction.amount > 0)
        ))
        if start_date and end_date:
            top_sum_q = top_sum_q.where(and_(BalanceTransaction.created_at >= start_date, BalanceTransaction.created_at < end_date))
            
        if has_rep or has_reg:
            top_sum_q = top_sum_q.outerjoin(MedicalOrganization, BalanceTransaction.organization_id == MedicalOrganization.id)
            if has_rep:
                top_sum_q = top_sum_q.where(MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids)))
            if has_reg:
                top_sum_q = top_sum_q.where(MedicalOrganization.region_id.in_(region_ids))
        
        top_sum = (await db.execute(top_sum_q)).scalar() or 0.0
        
    return float(pay_sum), float(top_sum)

async def get_receipt_queries(
    db: AsyncSession, 
    start_date: Optional[datetime], 
    end_date: Optional[datetime],
    rep_ids: Optional[List[int]] = None,
    region_ids: Optional[List[int]] = None,
    product_id: Optional[int] = None
):
    """
    Returns (payment_q, topup_q) for Fact of Receipts.
    Standardizes the logic for both aggregate counts and detailed lists.
    """
    # 1. Invoiced Payments Query
    pay_q = select(Payment).join(Invoice, Payment.invoice_id == Invoice.id)
    pay_q = pay_q.where(or_(Payment.comment.is_(None), ~Payment.comment.ilike('%Автоматическое погашение%')))
    if start_date and end_date:
        pay_q = pay_q.where(and_(Payment.date >= start_date, Payment.date < end_date))
    
    # Apply filters - standard join chain
    pay_q = pay_q.join(Reservation, Invoice.reservation_id == Reservation.id)
    if rep_ids or region_ids or product_id:
        pay_q = pay_q.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
        if rep_ids:
            # Type safety: convert to int in case strings were passed
            clean_rep_ids = [int(i) for i in rep_ids if i is not None]
            pay_q = pay_q.where(or_(
                Reservation.created_by_id.in_(clean_rep_ids),
                MedicalOrganization.assigned_reps.any(User.id.in_(clean_rep_ids))
            ))
        if region_ids:
            clean_reg_ids = [int(i) for i in region_ids if i is not None]
            pay_q = pay_q.where(MedicalOrganization.region_id.in_(clean_reg_ids))
        if product_id:
            pay_q = pay_q.join(ReservationItem, Reservation.id == ReservationItem.reservation_id).where(ReservationItem.product_id == int(product_id))

    # 2. Standalone Refills Query (Only if no product filter)
    top_q = None
    if not product_id:
        top_q = select(BalanceTransaction).where(
            or_(
                func.lower(BalanceTransaction.transaction_type) == "topup",
                and_(func.lower(BalanceTransaction.transaction_type) == "adjustment", BalanceTransaction.amount > 0)
            )
        )
        if start_date and end_date:
            top_q = top_q.where(and_(BalanceTransaction.created_at >= start_date, BalanceTransaction.created_at < end_date))
            
        if rep_ids or region_ids:
            clean_rep_ids = [int(i) for i in rep_ids if i is not None] if rep_ids else []
            clean_reg_ids = [int(i) for i in region_ids if i is not None] if region_ids else []
            
            # Use OUTER JOIN to ensure top-ups are counted even if org/regions are partially missing
            top_q = top_q.outerjoin(MedicalOrganization, BalanceTransaction.organization_id == MedicalOrganization.id)
            if clean_rep_ids:
                # If rep filter is applied, we only show what's assigned to those reps
                top_q = top_q.where(MedicalOrganization.assigned_reps.any(User.id.in_(clean_rep_ids)))
            if clean_reg_ids:
                # If region filter is applied, we only show what belongs to that region
                top_q = top_q.where(MedicalOrganization.region_id.in_(clean_reg_ids))
                
    return pay_q, top_q

@router.get("/dashboard/global")
async def get_global_realtime_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    month: int = None,
    year: int = None,
    region_id: int = None
) -> Any:
    """
    Returns real-time aggregated global statistics.
    Aggregates from Invoice (Revenue), Payment (Fact), and BonusLedger (Bonuses).
    """
    
    if current_user.role not in [
        UserRole.INVESTOR,
        UserRole.DIRECTOR, 
        UserRole.DEPUTY_DIRECTOR, 
        UserRole.PRODUCT_MANAGER, 
        UserRole.FIELD_FORCE_MANAGER, 
        UserRole.REGIONAL_MANAGER,
        UserRole.HEAD_OF_WAREHOUSE,
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.HRD
    ]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Date Filtering Logic
    start_date = None
    end_date = None
    prev_start_date = None
    prev_end_date = None
    
    is_global_mode = not month or not year
    
    if not is_global_mode:
        # Start of period
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

    else:
        # Global mode: Compare this year vs last year (as an example of comparative context)
        # Or just show absolute totals without date filter
        pass

    # Regional Restriction for RM
    allowed_region_ids = None
    if current_user.role == UserRole.REGIONAL_MANAGER:
        allowed_region_ids = [r.id for r in current_user.assigned_regions]
        if region_id and region_id not in allowed_region_ids:
            region_id = -1 
    
    # Use selected region or all allowed regions
    final_region_ids = None
    if region_id and str(region_id).isdigit() and int(region_id) > 0:
        final_region_ids = [int(region_id)]
    elif allowed_region_ids:
        final_region_ids = allowed_region_ids
        
    if current_user.role == UserRole.REGIONAL_MANAGER and not final_region_ids:
        # RM must have at least one region, otherwise no data
        final_region_ids = [-1]

    # Calculate previous period boundaries (only if not in global mode)
    if not is_global_mode:
        if month == 1:
            prev_m, prev_y = 12, year - 1
        else:
            prev_m, prev_y = month - 1, year
        prev_start_date = datetime(prev_y, prev_m, 1)
        
        if prev_m == 12:
            prev_end_date = datetime(prev_y + 1, 1, 1)
        else:
            prev_end_date = datetime(prev_y, prev_m + 1, 1)

    # 1. HIERARCHY & REGION FILTERS
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    rep_ids = None
    if is_team_manager:
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids: rep_ids = [-1]

    # 2. CALCULATE CURRENT PERIOD
    # 2a. Receipts (Payments + Topups)
    c_pmt_sum, c_tp_sum = await _get_receipt_totals(db, start_date, end_date, rep_ids, final_region_ids)
    c_rev = c_pmt_sum + c_tp_sum

    # 2b. Invoiced Goal (Revenue Facturas)
    curr_inv_q = select(func.sum(Invoice.total_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
    if start_date and end_date: curr_inv_q = curr_inv_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids or final_region_ids:
        curr_inv_q = curr_inv_q.join(Reservation, Invoice.reservation_id == Reservation.id)
        if rep_ids: curr_inv_q = curr_inv_q.where(Reservation.created_by_id.in_(rep_ids))
        if final_region_ids:
            curr_inv_q = curr_inv_q.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    c_rev_inv = (await db.execute(curr_inv_q)).scalar() or 0.0

    # 2c. Bonus Accrued
    curr_bonus_q = select(func.sum(BonusLedger.amount)).where(BonusLedger.ledger_type == LedgerType.ACCRUAL)
    if start_date and end_date: curr_bonus_q = curr_bonus_q.where(and_(BonusLedger.created_at >= start_date, BonusLedger.created_at < end_date))
    if rep_ids: curr_bonus_q = curr_bonus_q.where(BonusLedger.user_id.in_(rep_ids))
    if final_region_ids:
        curr_bonus_q = curr_bonus_q.join(User, BonusLedger.user_id == User.id).join(Doctor, BonusLedger.doctor_id == Doctor.id).where(Doctor.region_id.in_(final_region_ids))
    c_bon = (await db.execute(curr_bonus_q)).scalar() or 0.0

    # 2d. Items Sold Qty
    curr_qty_q = select(func.sum(ReservationItem.quantity)).join(Reservation, ReservationItem.reservation_id == Reservation.id).join(Invoice, Invoice.reservation_id == Reservation.id).where(Invoice.status != InvoiceStatus.CANCELLED)
    if start_date and end_date: curr_qty_q = curr_qty_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids: curr_qty_q = curr_qty_q.where(Reservation.created_by_id.in_(rep_ids))
    if final_region_ids:
        curr_qty_q = curr_qty_q.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    c_qty = (await db.execute(curr_qty_q)).scalar() or 0

    # 2e. Total Debt (Up to end_date)
    curr_debt_q = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).where(Invoice.status != InvoiceStatus.CANCELLED)
    if end_date: curr_debt_q = curr_debt_q.where(Invoice.date < end_date)
    if rep_ids or final_region_ids:
        curr_debt_q = curr_debt_q.join(Reservation, Invoice.reservation_id == Reservation.id)
        if rep_ids: curr_debt_q = curr_debt_q.where(Reservation.created_by_id.in_(rep_ids))
        if final_region_ids:
            curr_debt_q = curr_debt_q.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
    c_debt = (await db.execute(curr_debt_q)).scalar() or 0.0

    # 3. CALCULATE PREVIOUS PERIOD (For trend percentages)
    p_rev = 0.0
    p_bon = 0.0
    p_qty = 0
    p_debt = 0.0
    
    if not is_global_mode:
        prev_pmt_q, prev_tp_q = await get_receipt_queries(db, prev_start_date, prev_end_date, rep_ids, final_region_ids)
        
        prev_pmt_subq = prev_pmt_q.subquery()
        p_rev_pmt = (await db.execute(select(func.sum(prev_pmt_subq.c.amount)))).scalar() or 0.0
        
        p_rev_tp = 0.0
        if prev_tp_q is not None:
            prev_tp_subq = prev_tp_q.subquery()
            p_rev_tp = (await db.execute(select(func.sum(prev_tp_subq.c.amount)))).scalar() or 0.0
            
        p_rev = float(p_rev_pmt) + float(p_rev_tp)
        
        # We skip full previous calc for bon/qty/debt if performance is an issue, but let's be thorough
        # [Simplified previous calc for brevity, but keeping revenue for trends]
    
    p_bon = (await db.execute(prev_bonus_q)).scalar() or 0.0
    p_qty = (await db.execute(prev_qty_q)).scalar() or 0
    p_debt = (await db.execute(prev_debt_q)).scalar() or 0.0

    # Trend calculation
    def calc_trend(current, prev):
        if prev == 0 and current == 0:
            return "0%"
        if prev == 0:
            return "+100%"
        change = ((current - prev) / prev) * 100
        sign = "+" if change > 0 else ""
        return f"{sign}{change:.1f}%"

    rev_change = calc_trend(c_rev, p_rev)
    bon_change = calc_trend(c_bon, p_bon)
    qty_change = calc_trend(c_qty, p_qty)
    debt_change = calc_trend(c_debt, p_debt)
    
    # Growth peak (max of positive changes, else 0%)
    changes = []
    for measure, c in [('rev', rev_change), ('bon', bon_change), ('qty', qty_change)]: 
        try:
            val = float(str(c).replace('%', '').replace('+', ''))
            if measure == 'bon': # For bonus, decrease is good, increase is bad
                val = -val
            changes.append(val)
        except ValueError:
            pass
    if changes and max(changes) > 0:
        growth_peak = f"+{max(changes):.1f}%"
    else:
        growth_peak = "0%"

    # Recent activities (last 5 payments/invoices)
    activities = []
    if current_user.role in [UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.ACCOUNTANT]:
        # Latest Payments (linking to invoice if possible)
        recent_payments = (await db.execute(
            select(Payment).options(selectinload(Payment.invoice)).order_by(Payment.date.desc()).limit(3)
        )).scalars().all()
        for p in recent_payments:
            invoice_num = p.invoice.factura_number if p.invoice else None
            activities.append({
                "type": "payment",
                "id": p.id,
                "invoice_id": p.invoice_id,
                "title": "Оплата фактуры",
                "desc": f"{p.comment or 'Поступление средств'} ({p.invoice.customer_name if p.invoice else ''})",
                "amount": f"+{p.amount:,.0f} UZS",
                "time": p.date.strftime("%d.%m.%Y %H:%M"),
                "color": "green",
                "reference": invoice_num or str(p.id),
                "dt": p.date
            })
            
        # Latest Topups
        recent_topups = (await db.execute(
            select(BalanceTransaction).options(selectinload(BalanceTransaction.organization))
            .where(BalanceTransaction.transaction_type == BalanceTransactionType.TOPUP)
            .order_by(BalanceTransaction.created_at.desc()).limit(2)
        )).scalars().all()
        for tp in recent_topups:
            activities.append({
                "type": "payment",
                "id": tp.id,
                "title": "Пополнение баланса",
                "desc": f"{tp.comment or 'Прямое пополнение'} ({tp.organization.name if tp.organization else 'N/A'})",
                "amount": f"+{tp.amount:,.0f} UZS",
                "time": tp.created_at.strftime("%d.%m.%Y %H:%M"),
                "color": "indigo",
                "reference": tp.organization.name if tp.organization else str(tp.id),
                "dt": tp.created_at
            })
            
        # Latest Invoices
        recent_invoices = (await db.execute(
            select(Invoice).order_by(Invoice.date.desc()).limit(3)
        )).scalars().all()
        for i in recent_invoices:
            activities.append({
                "type": "invoice",
                "id": i.id,
                "title": "Новая фактура",
                "desc": f"Фактура №{i.factura_number or i.id} ({i.customer_name})",
                "amount": f"{i.total_amount:,.0f} UZS",
                "time": i.date.strftime("%d.%m.%Y %H:%M"),
                "color": "blue",
                "reference": i.factura_number or str(i.id),
                "dt": i.date
            })
            
        # Sort combined and take top 5
        activities.sort(key=lambda x: x["dt"], reverse=True)
        activities = activities[:5]
        for a in activities:
            del a["dt"] # remove date obj
 
    return {
        "month": month,
        "year": year,
        "total_revenue": c_rev,
        "revenue_payments": c_pmt_sum,
        "revenue_topups": c_tp_sum,
        "total_bonus_accrued": c_bon,
        "total_items_sold": c_qty,
        "total_debt": c_debt,
        "revenue_change": rev_change,
        "bonus_change": bon_change,
        "items_sold_change": qty_change,
        "debt_change": debt_change,
        "growth_peak": growth_peak,
        "recent_activities": activities
    }

@router.get("/stats/comprehensive")
async def get_comprehensive_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    month: int = None,
    year: int = None,
    quarter: int = None,
    region_id: int = None,
    med_rep_id: int = None,
    product_id: int = None,
    product_manager_id: int = None
) -> Any:
    """
    Stabilized Comprehensive Analytics for Director Dashboard.
    Supports filtering by Date, Region, Product, and Team.
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 1. TEAM HIERARCHY
    rep_ids = None
    if med_rep_id and str(med_rep_id).isdigit():
        rep_ids = [int(med_rep_id)]
    elif product_manager_id and str(product_manager_id).isdigit():
        rep_ids = await get_descendant_ids(db, int(product_manager_id))
        if not rep_ids: rep_ids = [-1]
    elif current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]:
        # Implicitly filter by the current manager's team if no filter is selected
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids: rep_ids = [-1]
    
    # Robust Single IDs
    rid = int(region_id) if region_id and str(region_id).isdigit() and int(region_id) > 0 else None
    pid = int(product_id) if product_id and str(product_id).isdigit() and int(product_id) > 0 else None
    
    # Redefine those for the subqueries
    region_id = rid
    product_id = pid

    # 2. DATE RANGE
    start_date = None
    end_date = None
    if quarter and year:
        start_month = (quarter - 1) * 3 + 1
        start_date = datetime(year, start_month, 1)
        end_date = (datetime(year, start_month + 3, 1) if quarter < 4 else datetime(year + 1, 1, 1))
    elif month and year:
        start_date = datetime(year, month, 1)
        end_date = (datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1))
    elif year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year + 1, 1, 1)

    # 3. KPI AGGREGATIONS
    # Filter helper
    def apply_filters(q, model_ref=Reservation):
        if rep_ids or region_id:
            q = q.outerjoin(MedicalOrganization, model_ref.med_org_id == MedicalOrganization.id)
            
        if rep_ids: 
            q = q.where(
                or_(
                    model_ref.created_by_id.in_(rep_ids),
                    MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))
                )
            )
        if region_id: 
            q = q.where(MedicalOrganization.region_id == region_id)
            
        if product_id:
            q = q.join(ReservationItem, model_ref.id == ReservationItem.reservation_id).where(ReservationItem.product_id == product_id)
        return q

    # Sales Plan (UZS)
    plan_q = select(func.sum(Plan.target_amount).label("total"))
    if quarter and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month.in_(list(range((quarter-1)*3+1, (quarter-1)*3+4)))))
    elif month and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month == month))
    elif year: plan_q = plan_q.where(Plan.year == year)
    if rep_ids: plan_q = plan_q.where(Plan.med_rep_id.in_(rep_ids))
    if region_id: plan_q = plan_q.join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)
    if product_id: plan_q = plan_q.where(Plan.product_id == product_id)
    plan_sum = (await db.execute(plan_q)).scalar() or 0

    # Sales Fact (Expected Revenue from Facturas)
    sales_q = select(func.sum(Invoice.total_amount).label("total")).where(Invoice.status != InvoiceStatus.CANCELLED)
    if start_date and end_date: sales_q = sales_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids or region_id or product_id:
        sales_q = sales_q.join(Reservation, Invoice.reservation_id == Reservation.id)
        sales_q = apply_filters(sales_q, Reservation)
    sales_total = (await db.execute(sales_q)).scalar() or 0

    # Sales Fact (Actual Payments Received)
    # Using unified helper for absolute consistency
    fact_invoice_sum, fact_topup_sum = await _get_receipt_totals(db, start_date, end_date, rep_ids, [rid] if rid else None, pid)
    fact_sum = round(float(fact_invoice_sum) + float(fact_topup_sum), 2)

    # Bonus Ledger (Earned, Paid, Advances)
    bonus_q = select(BonusLedger.ledger_type, BonusLedger.amount, BonusLedger.is_paid, BonusLedger.notes).join(User, BonusLedger.user_id == User.id).where(User.is_active == True, User.role == UserRole.MED_REP)
    if start_date and end_date: bonus_q = bonus_q.where(and_(BonusLedger.created_at >= start_date, BonusLedger.created_at < end_date))
    if rep_ids: bonus_q = bonus_q.where(BonusLedger.user_id.in_(rep_ids))
    if region_id: bonus_q = bonus_q.join(Doctor, BonusLedger.doctor_id == Doctor.id).where(Doctor.region_id == region_id)
    if product_id: bonus_q = bonus_q.where(BonusLedger.product_id == product_id)
    
    bonus_res = (await db.execute(bonus_q)).all()
    
    accrued_sum = 0.0
    paid_sum = 0.0
    allocated_sum = 0.0

    for r in bonus_res:
        if r.ledger_type == LedgerType.ACCRUAL:
            accrued_sum += r.amount
            if r.is_paid:
                paid_sum += r.amount
        elif r.ledger_type == LedgerType.ADVANCE:
            paid_sum += r.amount
        elif r.ledger_type == LedgerType.PAYOUT:
            paid_sum += r.amount
        elif r.ledger_type == LedgerType.OFFSET:
            allocated_sum += abs(r.amount)

    # Calculate dynamic Predinvest and Balance
    total_predinvest = max(0, paid_sum - accrued_sum)
    bonus_balance = max(0, accrued_sum - paid_sum)

    # Debt (Outstanding from Invoices)
    debt_q = select(func.sum(Invoice.total_amount - Invoice.paid_amount).label("total")).where(Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.APPROVED]))
    if start_date and end_date: debt_q = debt_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids or region_id or product_id:
        debt_q = debt_q.outerjoin(Reservation, Invoice.reservation_id == Reservation.id)
        debt_q = apply_filters(debt_q, Reservation)
    debt_sum = (await db.execute(debt_q)).scalar() or 0

    # Realized Gross Profit (Company Profit)
    # realized_profit = sum( (price - production_price - salary - bonus) * qty ) * (paid_amount / total_amount)
    # We use a simplified approx: (Sum(Potential Profit) * (Invoice.paid_amount / Invoice.total_amount))
    # To be more precise, we join all items.
    from app.models.product import Product
    
    # Sales Realized Gross Profit (Actually Paid portion of profit)
    gross_profit_sum_q = select(
        func.coalesce(func.sum(
            (ReservationItem.price * (1 - func.coalesce(ReservationItem.discount_percent, 0) / 100.0) - 
             func.coalesce(Product.production_price, 0) - 
             case((ReservationItem.salary_amount > 0, ReservationItem.salary_amount), else_=func.coalesce(Product.salary_expense, 0)) - 
             case((ReservationItem.marketing_amount > 0, ReservationItem.marketing_amount), else_=func.coalesce(Product.marketing_expense, 0)) -
             func.coalesce(Product.other_expenses, 0)) * 
            ReservationItem.quantity * (func.coalesce(Invoice.paid_amount, 0) / Invoice.total_amount)
        ), 0.0)
    ).select_from(ReservationItem)\
     .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
     .join(Invoice, Invoice.reservation_id == Reservation.id)\
     .join(Product, ReservationItem.product_id == Product.id)\
     .where(and_(Invoice.total_amount > 0, Invoice.status != InvoiceStatus.CANCELLED))

    if start_date and end_date: gross_profit_sum_q = gross_profit_sum_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids or region_id: 
        gross_profit_sum_q = gross_profit_sum_q.outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
    if rep_ids: 
        gross_profit_sum_q = gross_profit_sum_q.where(
            or_(
                Reservation.created_by_id.in_(rep_ids),
                MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))
            )
        )
    if region_id:
        gross_profit_sum_q = gross_profit_sum_q.where(MedicalOrganization.region_id == region_id)
    if product_id:
        gross_profit_sum_q = gross_profit_sum_q.where(ReservationItem.product_id == product_id)
    
    gross_profit_sum = (await db.execute(gross_profit_sum_q)).scalar() or 0.0

    # Sales Potential Gross Profit (Expected based on Invoices total)
    potential_profit_sum_q = select(
        func.coalesce(func.sum(
            (ReservationItem.price * (1 - func.coalesce(ReservationItem.discount_percent, 0) / 100.0) - 
             func.coalesce(Product.production_price, 0) - 
             case((ReservationItem.salary_amount > 0, ReservationItem.salary_amount), else_=func.coalesce(Product.salary_expense, 0)) - 
             case((ReservationItem.marketing_amount > 0, ReservationItem.marketing_amount), else_=func.coalesce(Product.marketing_expense, 0)) -
             func.coalesce(Product.other_expenses, 0)) * 
            ReservationItem.quantity
        ), 0.0)
    ).select_from(ReservationItem)\
     .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
     .join(Invoice, Invoice.reservation_id == Reservation.id)\
     .join(Product, ReservationItem.product_id == Product.id)\
     .where(and_(Invoice.total_amount > 0, Invoice.status != InvoiceStatus.CANCELLED))
    
    if start_date and end_date: potential_profit_sum_q = potential_profit_sum_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if rep_ids or region_id: 
        potential_profit_sum_q = potential_profit_sum_q.outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
    if rep_ids: 
        potential_profit_sum_q = potential_profit_sum_q.where(
            or_(
                Reservation.created_by_id.in_(rep_ids),
                MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))
            )
        )
    if region_id:
        potential_profit_sum_q = potential_profit_sum_q.where(MedicalOrganization.region_id == region_id)
    if product_id:
        potential_profit_sum_q = potential_profit_sum_q.where(ReservationItem.product_id == product_id)
        
    potential_profit_sum = (await db.execute(potential_profit_sum_q)).scalar() or 0.0

    # Total Expenses (Prochie Rasxodi)
    from app.services.expense_service import ExpenseService
    total_expenses = await ExpenseService.get_total_expenses(db, start_date, end_date)

    # 3. NEW Dashbaord KPIs
    # 3a. Shipment Fact (Invoices Total)
    invoice_q = select(
        func.coalesce(func.sum(Invoice.total_amount), 0.0).label("total"),
        func.coalesce(func.sum(Invoice.paid_amount), 0.0).label("paid")
    ).outerjoin(Reservation, Invoice.reservation_id == Reservation.id).where(Invoice.status != InvoiceStatus.CANCELLED)
    invoice_q = apply_filters(invoice_q, Reservation)
    if start_date and end_date: invoice_q = invoice_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    
    inv_res = (await db.execute(invoice_q)).first()
    total_invoice_sum = float(inv_res.total) if inv_res and inv_res.total else 0.0
    paid_invoice_sum = float(inv_res.paid) if inv_res and inv_res.paid else 0.0
    
    # 3b. Items Sold (Count)
    items_sold_q = select(func.coalesce(func.sum(ReservationItem.quantity), 0))\
        .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
        .join(Invoice, Invoice.reservation_id == Reservation.id)\
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    items_sold_q = apply_filters(items_sold_q, Reservation)
    if start_date and end_date: items_sold_q = items_sold_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if product_id: items_sold_q = items_sold_q.where(ReservationItem.product_id == product_id)
    
    total_items_sold = int((await db.execute(items_sold_q)).scalar() or 0)

    # 3c. Overdue Receivables (Older than 30 days)
    overdue_date = datetime.utcnow() - timedelta(days=30)
    overdue_q = select(func.coalesce(func.sum(Invoice.total_amount - Invoice.paid_amount), 0.0))\
        .outerjoin(Reservation, Invoice.reservation_id == Reservation.id)\
        .where(and_(
            (Invoice.total_amount - Invoice.paid_amount) > 1.0,
            func.coalesce(Invoice.realization_date, Invoice.date) < overdue_date
        ))
    overdue_q = apply_filters(overdue_q, Reservation)
    overdue_receivables = round(float((await db.execute(overdue_q)).scalar() or 0.0), 2)

    # 3d. MedRep Salary Stats
    # Realized salary based on invoice payments
    salary_accrued_q = select(
        func.coalesce(func.sum(ReservationItem.salary_amount * ReservationItem.quantity), 0.0)
    ).select_from(ReservationItem)\
     .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
     .join(Invoice, Invoice.reservation_id == Reservation.id)\
     .where(and_(Reservation.is_salary_enabled == True, Invoice.status != InvoiceStatus.CANCELLED))
    salary_accrued_q = apply_filters(salary_accrued_q, Reservation)
    if start_date and end_date: salary_accrued_q = salary_accrued_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if product_id: salary_accrued_q = salary_accrued_q.where(ReservationItem.product_id == product_id)
    
    salary_accrued = (await db.execute(salary_accrued_q)).scalar() or 0.0
    
    # We estimate salary_paid as the realization of accruals (same logic as profit)
    salary_paid_q = select(
        func.coalesce(func.sum(
            (ReservationItem.salary_amount * ReservationItem.quantity) * (func.coalesce(Invoice.paid_amount, 0) / Invoice.total_amount)
        ), 0.0)
    ).select_from(ReservationItem)\
     .join(Reservation, ReservationItem.reservation_id == Reservation.id)\
     .join(Invoice, Invoice.reservation_id == Reservation.id)\
     .where(and_(Reservation.is_salary_enabled == True, Invoice.total_amount > 0, Invoice.status != InvoiceStatus.CANCELLED))
    salary_paid_q = apply_filters(salary_paid_q, Reservation)
    if start_date and end_date: salary_paid_q = salary_paid_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
    if product_id: salary_paid_q = salary_paid_q.where(ReservationItem.product_id == product_id)
    
    salary_paid = (await db.execute(salary_paid_q)).scalar() or 0.0
    salary_balance = max(0, salary_accrued - salary_paid)

    net_profit = gross_profit_sum - total_expenses

    # 4. PRODUCT STATS (Safe Split Logic)
    product_stats_map = {}
    
    # 4a. Plan Products
    plan_q = select(
        Plan.product_id,
        func.sum(Plan.target_amount).label("plan_uzs"),
        func.sum(Plan.target_quantity).label("plan_qty")
    ).group_by(Plan.product_id)
    
    if quarter and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month.in_(list(range((quarter-1)*3+1, (quarter-1)*3+4)))))
    elif month and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month == month))
    elif year: plan_q = plan_q.where(Plan.year == year)
    if rep_ids: plan_q = plan_q.where(Plan.med_rep_id.in_(rep_ids))
    if region_id: plan_q = plan_q.join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)
    if product_id: plan_q = plan_q.where(Plan.product_id == product_id)
    
    plan_res = (await db.execute(plan_q)).all()
    for row in plan_res:
        product_stats_map[row.product_id] = {
            "plan_uzs": row.plan_uzs, "plan_qty": row.plan_qty,
            "fact_uzs": 0, "fact_qty": 0
        }

    # 4b. Fact Products
    from app.models.product import Product
    fact_q = select(
        DoctorFactAssignment.product_id,
        func.sum(DoctorFactAssignment.quantity).label("fact_qty"),
        func.sum(DoctorFactAssignment.quantity * Product.price).label("fact_uzs")
    ).join(Product, DoctorFactAssignment.product_id == Product.id).group_by(DoctorFactAssignment.product_id)
    
    if quarter and year: fact_q = fact_q.where(and_(DoctorFactAssignment.year == year, DoctorFactAssignment.month.in_(list(range((quarter-1)*3+1, (quarter-1)*3+4)))))
    elif month and year: fact_q = fact_q.where(and_(DoctorFactAssignment.year == year, DoctorFactAssignment.month == month))
    elif year: fact_q = fact_q.where(DoctorFactAssignment.year == year)
    if rep_ids: fact_q = fact_q.where(DoctorFactAssignment.med_rep_id.in_(rep_ids))
    if region_id: fact_q = fact_q.join(Doctor, DoctorFactAssignment.doctor_id == Doctor.id).where(Doctor.region_id == region_id)
    if product_id: fact_q = fact_q.where(DoctorFactAssignment.product_id == product_id)
    
    fact_res = (await db.execute(fact_q)).all()
    for row in fact_res:
        if row.product_id not in product_stats_map:
            product_stats_map[row.product_id] = {"plan_uzs": 0, "plan_qty": 0, "fact_uzs": 0, "fact_qty": 0}
        product_stats_map[row.product_id]["fact_uzs"] += (row.fact_uzs or 0)
        product_stats_map[row.product_id]["fact_qty"] += (row.fact_qty or 0)

    # 4c. Fetch Product Names and Build Array
    product_stats = []
    if product_stats_map:
        prod_ids = list(product_stats_map.keys())
        prods = (await db.execute(select(Product.id, Product.name).where(Product.id.in_(prod_ids)))).all()
        prod_name_map = {p.id: p.name for p in prods}
        
        for pid, stats in product_stats_map.items():
            product_stats.append({
                "id": pid,
                "name": prod_name_map.get(pid, f"Product {pid}"),
                "plan_uzs": stats["plan_uzs"],
                "plan_qty": stats["plan_qty"],
                "fact_uzs": stats["fact_uzs"],
                "fact_qty": stats["fact_qty"]
            })

    # 5. TRENDS (Charts)
    trends = []
    if start_date and end_date:
        diff_days = (end_date - start_date).days
        is_monthly_view = diff_days <= 31
        
        # Combined Fact Trend (Payments + Topups)
        # 1. Invoiced Payments Trend
        fact_trend_q, top_trend_q = await get_receipt_queries(db, start_date, end_date, rep_ids, [region_id] if region_id else None, product_id)
        
        fact_trend_q = fact_trend_q.with_only_columns(
            func.cast(Payment.date, Date).label("d"),
            func.sum(Payment.amount).label("fact")
        ).group_by(func.cast(Payment.date, Date))
        
        fact_trend_res = (await db.execute(fact_trend_q)).all()
        fact_map = {r.d: float(r.fact or 0) for r in fact_trend_res}

        # 2. Add Topups to Trend Map
        if top_trend_q is not None:
            top_trend_q = top_trend_q.with_only_columns(
                func.cast(BalanceTransaction.created_at, Date).label("d"),
                func.sum(BalanceTransaction.amount).label("fact")
            ).group_by(func.cast(BalanceTransaction.created_at, Date))
            
            top_trend_res = (await db.execute(top_trend_q)).all()
            for r in top_trend_res:
                fact_map[r.d] = fact_map.get(r.d, 0) + float(r.fact or 0)

        # Plan Trend
        plan_trend_q = select(
            Plan.month,
            func.sum(Plan.target_amount).label("plan")
        ).where(Plan.year == start_date.year).group_by(Plan.month)
        
        if rep_ids: plan_trend_q = plan_trend_q.where(Plan.med_rep_id.in_(rep_ids))
        if region_id: plan_trend_q = plan_trend_q.join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)
        if product_id: plan_trend_q = plan_trend_q.where(Plan.product_id == product_id)
        
        plan_trend_res = (await db.execute(plan_trend_q)).all()
        plan_month_map = {r.month: float(r.plan or 0) for r in plan_trend_res}

        if is_monthly_view:
            iter_date = start_date.date()
            while iter_date < end_date.date():
                daily_plan = plan_month_map.get(iter_date.month, 0) / (max(1, diff_days))
                trends.append({
                    "label": iter_date.strftime("%d.%m"),
                    "fact": fact_map.get(iter_date, 0),
                    "plan": round(daily_plan, 2)
                })
                iter_date += timedelta(days=1)
        else:
            for m in range(1, 13):
                m_fact = sum(v for d, v in fact_map.items() if d.month == m)
                trends.append({
                    "label": datetime(2000, m, 1).strftime("%b"),
                    "fact": m_fact,
                    "plan": plan_month_map.get(m, 0)
                })

    kpis = {
        "sales_plan_amount": float(plan_sum),
        "sales_fact_received_amount": float(fact_sum),
        "fact_from_invoices": float(fact_invoice_sum),
        "fact_from_topups": float(fact_topup_sum),
        "debug_receipts": [
            {"date": t.created_at.strftime("%Y-%m-%d") if t.created_at else "-", "amount": t.amount, "type": t.transaction_type, "comment": t.comment}
            for t in (await db.execute(select(BalanceTransaction).order_by(BalanceTransaction.created_at.desc()).limit(10))).scalars().all()
        ],
        "total_invoice_sum": float(total_invoice_sum),
        "total_items_sold": int(total_items_sold),
        "bonus_accrued": float(accrued_sum),
        "bonus_allocated": float(allocated_sum),
        "bonus_paid": float(paid_sum),
        "bonus_balance": float(bonus_balance),
        "total_predinvest": float(total_predinvest),
        "receivables": float(debt_sum),
        "overdue_receivables": float(overdue_receivables),
        "salary_accrued": float(salary_accrued),
        "salary_paid": float(salary_paid),
        "salary_balance": float(salary_balance),
        "gross_profit": float(gross_profit_sum if fact_sum > 0 else potential_profit_sum),
        "total_expenses": float(total_expenses),
        "net_profit": float((gross_profit_sum if fact_sum > 0 else potential_profit_sum) - total_expenses),
    }

    return {
        "kpis": kpis,
        **kpis,
        "product_stats": product_stats,
        "trends": trends,
        "view_mode": "accountant" if current_user.role == UserRole.ACCOUNTANT else "standard"
    }

@router.get("/stats/comprehensive/drilldown/export")
async def export_drilldown_excel(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    metric: str = Query(...),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    med_rep_id: Optional[int] = Query(None),
    product_manager_id: Optional[int] = Query(None)
) -> Any:
    """
    Export drilldown data to Excel. Currently specialized for 'cash_in'.
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.ACCOUNTANT, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 1. TEAM HIERARCHY
    rep_ids = None
    if med_rep_id:
        rep_ids = [med_rep_id]
    elif product_manager_id:
        rep_ids = await get_descendant_ids(db, product_manager_id)
        if not rep_ids: rep_ids = [-1]
    elif current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]:
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids: rep_ids = [-1]

    # 2. DATE RANGE
    start_date = None
    end_date = None
    if year:
        if month:
            start_date = datetime(year, month, 1)
            next_m = month + 1
            next_y = year
            if next_m > 12:
                next_m = 1
                next_y += 1
            end_date = datetime(next_y, next_m, 1)
        elif quarter:
            start_month = (quarter - 1) * 3 + 1
            start_date = datetime(year, start_month, 1)
            next_m = start_month + 3
            next_y = year
            if next_m > 12:
                next_m = 1
                next_y += 1
            end_date = datetime(next_y, next_m, 1)
        else:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year + 1, 1, 1)

    # 3. Fetch Data (specialized for cash_in for now)
    if metric == "cash_in":
        # Using unified receipt queries
        fact_q, topup_q = await get_receipt_queries(db, start_date, end_date, rep_ids, [region_id] if region_id else None, product_id)
        
        # Add options for relation loading
        fact_q = fact_q.options(selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.med_org))
        
        payment_rows = (await db.execute(fact_q.order_by(Payment.date.desc()))).scalars().all()
        
        topup_rows = []
        if topup_q is not None:
            topup_q = topup_q.options(selectinload(BalanceTransaction.organization))
            topup_rows = (await db.execute(topup_q.order_by(BalanceTransaction.created_at.desc()))).scalars().all()

        # 3. Combine and Format
        all_data = []
        from datetime import time
        for p in payment_rows:
            # Standardize to datetime for sorting (midnight)
            sort_dt = datetime.combine(p.date, time.min) if isinstance(p.date, date) and not isinstance(p.date, datetime) else p.date
            all_data.append({
                "date": sort_dt,
                "inn": p.invoice.reservation.med_org.inn if p.invoice and p.invoice.reservation and p.invoice.reservation.med_org else "-",
                "customer": p.invoice.reservation.customer_name if p.invoice and p.invoice.reservation else "-",
                "amount": p.amount,
                "comment": p.comment or ""
            })
        for t in topup_rows:
            all_data.append({
                "date": t.created_at,
                "inn": t.organization.inn if t.organization else "-",
                "customer": t.organization.name if t.organization else "-",
                "amount": t.amount,
                "comment": f"ПОПОЛНЕНИE: {t.comment or ''}"
            })
        
        all_data.sort(key=lambda x: x["date"], reverse=True)

        # 4. Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Postupleniya"
        
        headers = ["тушган пул санаси", "ИНН", "Контрагент", "Сumma", "Izoh"]
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal='center')
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            
        for row_idx, r in enumerate(all_data, 2):
            ws.cell(row=row_idx, column=1, value=r["date"].strftime('%d.%m.%Y'))
            ws.cell(row=row_idx, column=2, value=r["inn"])
            ws.cell(row=row_idx, column=3, value=r["customer"])
            ws.cell(row=row_idx, column=4, value=r["amount"])
            ws.cell(row=row_idx, column=5, value=r["comment"])

        # Autofit columns
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except: pass
            ws.column_dimensions[column_letter].width = max_length + 2

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"Postupleniya_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    raise HTTPException(status_code=400, detail="Export not implemented for this metric")


@router.get("/stats/comprehensive/drilldown")
async def get_comprehensive_drilldown(
    metric: str = Query(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    month: int = None,
    year: int = None,
    quarter: int = None,
    region_id: int = None,
    med_rep_id: int = None,
    product_id: int = None,
    product_manager_id: int = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    if metric == "cash_in": skip, limit = 0, 1000 # Special case for receipts
    
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.HRD]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    rep_ids = None
    if med_rep_id:
        rep_ids = [med_rep_id]
    elif product_manager_id:
        rep_ids = await get_descendant_ids(db, product_manager_id)
        if not rep_ids: rep_ids = [-1]

    start_date = None
    end_date = None
    if quarter and year:
        start_month = (quarter - 1) * 3 + 1
        start_date = datetime(year, start_month, 1)
        end_date = (datetime(year, start_month + 3, 1) if quarter < 4 else datetime(year + 1, 1, 1))
    elif month and year:
        start_date = datetime(year, month, 1)
        end_date = (datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1))
    elif year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year + 1, 1, 1)

    def apply_filters(q, model_ref=Reservation):
        if rep_ids or region_id:
            q = q.outerjoin(MedicalOrganization, model_ref.med_org_id == MedicalOrganization.id)
        if rep_ids: 
            q = q.where(
                or_(
                    model_ref.created_by_id.in_(rep_ids),
                    MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))
                )
            )
        if region_id: 
            q = q.where(MedicalOrganization.region_id == region_id)
        if product_id:
            q = q.join(ReservationItem, model_ref.id == ReservationItem.reservation_id).where(ReservationItem.product_id == product_id)
        return q

    if metric == "sales_plan":
        plan_q = select(Plan).options(selectinload(Plan.med_rep), selectinload(Plan.product), selectinload(Plan.doctor))
        # Filter out zero-target plans to avoid clutter
        plan_q = plan_q.where(or_(Plan.target_amount > 0, Plan.target_quantity > 0))
        
        if quarter and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month.in_(list(range((quarter-1)*3+1, (quarter-1)*3+4)))))
        elif month and year: plan_q = plan_q.where(and_(Plan.year == year, Plan.month == month))
        elif year: plan_q = plan_q.where(Plan.year == year)
        if rep_ids: plan_q = plan_q.where(Plan.med_rep_id.in_(rep_ids))
        if region_id: plan_q = plan_q.join(MedicalOrganization, Plan.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id == region_id)
        if product_id: plan_q = plan_q.where(Plan.product_id == product_id)
        rows = (await db.execute(plan_q.offset(skip).limit(limit))).scalars().all()
        return [
            {
                "id": r.id, 
                "med_rep": r.med_rep.full_name if r.med_rep else "-", 
                "doctor": r.doctor.full_name if r.doctor else "-",
                "product": r.product.name if r.product else "-", 
                "month": r.month, 
                "year": r.year, 
                "amount": r.target_amount, 
                "qty": r.target_quantity
            } for r in rows
        ]

    elif metric == "realization":
        real_q = select(Invoice).options(selectinload(Invoice.reservation)).where(Invoice.status != InvoiceStatus.CANCELLED)
        if start_date and end_date: real_q = real_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
        if rep_ids or region_id or product_id:
            real_q = real_q.join(Reservation, Invoice.reservation_id == Reservation.id)
            real_q = apply_filters(real_q, Reservation)
        rows = (await db.execute(real_q.order_by(Invoice.date.desc()).offset(skip).limit(limit))).scalars().all()
        return [{"id": r.id, "date": r.date.isoformat() if r.date else "-", "invoice_num": r.factura_number, "total_amount": r.total_amount, "customer": r.reservation.customer_name if r.reservation else "-"} for r in rows]

    elif metric == "cash_in":
        # Using unified receipt queries
        fact_q, topup_q = await get_receipt_queries(db, start_date, end_date, rep_ids, [region_id] if region_id else None, product_id)
        
        # Add options for relation loading
        fact_q = fact_q.options(selectinload(Payment.invoice).selectinload(Invoice.reservation).selectinload(Reservation.med_org))
        
        payment_rows = (await db.execute(fact_q.order_by(Payment.date.desc()))).scalars().all()
        
        topup_rows = []
        if topup_q is not None:
            topup_q = topup_q.options(selectinload(BalanceTransaction.organization))
            topup_rows = (await db.execute(topup_q.order_by(BalanceTransaction.created_at.desc()))).scalars().all()

        # 3. Combine and Format
        all_results = []
        from datetime import time
        for r in payment_rows:
            # We must use isoformat or similar for the return JSON, 
            # but ensure we handle both date and datetime types.
            dt_str = r.date.isoformat() if hasattr(r.date, "isoformat") else str(r.date)
            all_results.append({
                "id": r.id, 
                "date": dt_str, 
                "amount": r.amount, 
                "type": r.payment_type, 
                "invoice_num": r.invoice.factura_number if r.invoice else "-", 
                "customer": r.invoice.reservation.customer_name if r.invoice and r.invoice.reservation else "-",
                "inn": r.invoice.reservation.med_org.inn if r.invoice and r.invoice.reservation and r.invoice.reservation.med_org else "-",
                "comment": r.comment or "",
                "is_topup": False
            })
        for r in topup_rows:
            all_results.append({
                "id": r.id,
                "date": r.created_at.isoformat() if r.created_at else "-",
                "amount": r.amount,
                "type": "BALANCE",
                "invoice_num": "-",
                "customer": r.organization.name if r.organization else "-",
                "inn": r.organization.inn if r.organization else "-",
                "comment": f"ПОПОЛНЕНИE: {r.comment or ''}",
                "is_topup": True
            })
            
        # Since these are ISO strings, reverse sorting works correctly for chronology
        all_results.sort(key=lambda x: x["date"], reverse=True)
        # Apply skip/limit manually to the merged list
        return all_results[skip : skip + limit]

    elif metric == "receivables":
        debt_q = select(Invoice).options(selectinload(Invoice.reservation)).where(Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.APPROVED]))
        if start_date and end_date: debt_q = debt_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
        if rep_ids or region_id or product_id:
            debt_q = debt_q.join(Reservation, Invoice.reservation_id == Reservation.id)
            debt_q = apply_filters(debt_q, Reservation)
        debt_q = debt_q.where(func.coalesce(Invoice.total_amount, 0) > func.coalesce(Invoice.paid_amount, 0))
        rows = (await db.execute(debt_q.order_by(Invoice.date.desc()).offset(skip).limit(limit))).scalars().all()
        return [{"id": r.id, "date": r.date.isoformat() if r.date else "-", "invoice_num": r.factura_number, "total_amount": r.total_amount or 0, "paid_amount": r.paid_amount or 0, "debt_amount": (r.total_amount or 0) - (r.paid_amount or 0), "customer": r.reservation.customer_name if r.reservation else "-"} for r in rows]

    elif metric == "expenses":
        expense_q = select(OtherExpense).options(selectinload(OtherExpense.category), selectinload(OtherExpense.created_by))
        if start_date and end_date: expense_q = expense_q.where(and_(OtherExpense.date >= start_date, OtherExpense.date < end_date))
        if rep_ids: expense_q = expense_q.where(OtherExpense.created_by_id.in_(rep_ids))
        if region_id: expense_q = expense_q.where(OtherExpense.region_id == region_id)
        rows = (await db.execute(expense_q.order_by(OtherExpense.date.desc()).offset(skip).limit(limit))).scalars().all()
        return [{"id": r.id, "date": r.date.isoformat() if r.date else "-", "amount": r.amount, "category": r.category.name if r.category else "-", "description": r.comment or "-", "author": r.created_by.full_name if r.created_by else "-"} for r in rows]

    elif metric in ["bonus_accrued", "bonus_paid", "preinvest"]:
        from sqlalchemy.orm import selectinload as sil
        bonus_q = select(BonusLedger).options(
            sil(BonusLedger.doctor),
            sil(BonusLedger.user),
            sil(BonusLedger.product),
            sil(BonusLedger.payment).selectinload(Payment.invoice).selectinload(Invoice.reservation)
        ).join(User, BonusLedger.user_id == User.id).where(User.is_active == True, User.role == UserRole.MED_REP)
        
        if metric == "bonus_accrued":
            bonus_q = bonus_q.where(and_(BonusLedger.ledger_type == LedgerType.ACCRUAL, or_(BonusLedger.notes != "Аванс (Предынвест)", BonusLedger.notes.is_(None))))
        elif metric == "bonus_paid":
            bonus_q = bonus_q.where(and_(BonusLedger.ledger_type == LedgerType.ACCRUAL, BonusLedger.is_paid == True))
        elif metric == "preinvest":
            bonus_q = bonus_q.where(and_(BonusLedger.ledger_type == LedgerType.ACCRUAL, BonusLedger.notes == "Аванс (Предынвест)"))
        if start_date and end_date: bonus_q = bonus_q.where(and_(BonusLedger.created_at >= start_date, BonusLedger.created_at < end_date))
        if rep_ids: bonus_q = bonus_q.where(BonusLedger.user_id.in_(rep_ids))
        if region_id: bonus_q = bonus_q.join(Doctor, BonusLedger.doctor_id == Doctor.id).where(Doctor.region_id == region_id)
        if product_id: bonus_q = bonus_q.where(BonusLedger.product_id == product_id)
        rows = (await db.execute(bonus_q.order_by(BonusLedger.created_at.desc()).offset(skip).limit(limit))).scalars().all()

        result = []
        for r in rows:
            # Try to get payment/invoice info if bonus was triggered by a payment
            payment_info = None
            invoice_info = None
            if r.payment:
                p = r.payment
                payment_info = {
                    "payment_id": p.id,
                    "payment_amount": p.amount,
                    "payment_date": p.date.isoformat() if p.date else None,
                }
                if p.invoice:
                    inv = p.invoice
                    reservation = inv.reservation if inv else None
                    invoice_info = {
                        "invoice_id": inv.id,
                        "factura_number": inv.factura_number or f"#{inv.id}",
                        "invoice_total": inv.total_amount,
                        "invoice_paid": inv.paid_amount,
                        "customer": reservation.customer_name if reservation else "-",
                    }

            result.append({
                "id": r.id,
                "date": r.created_at.isoformat() if r.created_at else "-",
                "amount": r.amount,
                "doctor": r.doctor.full_name if r.doctor else "-",
                "med_rep": r.user.full_name if r.user else "-",
                "product": r.product.name if r.product else "-",
                "description": r.notes or "-",
                "payment": payment_info,
                "invoice": invoice_info,
            })
        return result

    elif metric == "gross_profit":
        gross_q = select(ReservationItem).options(selectinload(ReservationItem.product), selectinload(ReservationItem.reservation).selectinload(Reservation.invoice)).join(Reservation, ReservationItem.reservation_id == Reservation.id).join(Invoice, Invoice.reservation_id == Reservation.id).join(Product, ReservationItem.product_id == Product.id).where(and_(Invoice.total_amount > 0, Invoice.status != InvoiceStatus.CANCELLED))
        if start_date and end_date: gross_q = gross_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
        if rep_ids or region_id: gross_q = gross_q.outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
        if rep_ids: gross_q = gross_q.where(or_(Reservation.created_by_id.in_(rep_ids), MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))))
        if region_id: gross_q = gross_q.where(MedicalOrganization.region_id == region_id)
        if product_id: gross_q = gross_q.where(ReservationItem.product_id == product_id)
        
        rows = (await db.execute(gross_q.order_by(Invoice.date.desc()).offset(skip).limit(limit))).scalars().all()
        res_payload = []
        for r in rows:
            paid_ratio = (r.reservation.invoice.paid_amount or 0) / r.reservation.invoice.total_amount if r.reservation and r.reservation.invoice and r.reservation.invoice.total_amount > 0 else 0
            sale_price = r.price * (1 - (r.discount_percent or 0) / 100.0)
            prod_price = r.product.production_price or 0
            salary = r.salary_amount if (r.salary_amount or 0) > 0 else (r.product.salary_expense or 0)
            marketing = r.marketing_amount if (r.marketing_amount or 0) > 0 else (r.product.marketing_expense or 0)
            other_per_unit = r.product.other_expenses or 0
            unit_profit = sale_price - prod_price - salary - marketing - other_per_unit
            total_profit_realized = (unit_profit * r.quantity) * paid_ratio
            if total_profit_realized > 0:
                res_payload.append({
                    "id": r.id,
                    "invoice_num": r.reservation.invoice.factura_number if r.reservation and r.reservation.invoice else "-",
                    "date": r.reservation.invoice.date.isoformat() if r.reservation and r.reservation.invoice else "-",
                    "product": r.product.name if r.product else "-",
                    "qty": r.quantity,
                    "paid_ratio": round(paid_ratio * 100, 1),
                    "profit": float(total_profit_realized)
                })
        return res_payload

    elif metric == "net_profit":
        # Net profit = gross profit per invoice item - total other expenses
        # Show breakdown: gross profit by invoice item, then expenses as a footer row
        gross_q = select(ReservationItem).options(
            selectinload(ReservationItem.product),
            selectinload(ReservationItem.reservation).selectinload(Reservation.invoice).selectinload(Invoice.payments),
            selectinload(ReservationItem.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(ReservationItem.reservation).selectinload(Reservation.created_by)
        ).join(Reservation, ReservationItem.reservation_id == Reservation.id)\
         .join(Invoice, Invoice.reservation_id == Reservation.id)\
         .join(Product, ReservationItem.product_id == Product.id)\
         .where(and_(Invoice.total_amount > 0, Invoice.status != InvoiceStatus.CANCELLED))
        if start_date and end_date: gross_q = gross_q.where(and_(Invoice.date >= start_date, Invoice.date < end_date))
        if rep_ids or region_id: gross_q = gross_q.outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)
        if rep_ids: gross_q = gross_q.where(or_(Reservation.created_by_id.in_(rep_ids), MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids))))
        if region_id: gross_q = gross_q.where(MedicalOrganization.region_id == region_id)
        if product_id: gross_q = gross_q.where(ReservationItem.product_id == product_id)

        rows = (await db.execute(gross_q.order_by(Invoice.date.desc()).offset(skip).limit(limit))).scalars().all()
        res_payload = []
        for r in rows:
            inv = r.reservation.invoice if r.reservation else None
            if not inv or not inv.total_amount: continue
            paid_ratio = (inv.paid_amount or 0) / inv.total_amount
            sale_price = r.price * (1 - (r.discount_percent or 0) / 100.0)
            prod_price = r.product.production_price or 0
            salary = r.salary_amount if (r.salary_amount or 0) > 0 else (r.product.salary_expense or 0)
            marketing = r.marketing_amount if (r.marketing_amount or 0) > 0 else (r.product.marketing_expense or 0)
            other_per_unit = r.product.other_expenses or 0
            unit_profit = sale_price - prod_price - salary - marketing - other_per_unit
            total_profit_realized = (unit_profit * r.quantity) * paid_ratio
            region_name = (r.reservation.med_org.region.name if r.reservation and r.reservation.med_org and r.reservation.med_org.region else "-") if r.reservation else "-"
            med_rep_name = (r.reservation.created_by.full_name if r.reservation and r.reservation.created_by else "-")
            res_payload.append({
                "id": r.id,
                "invoice_num": inv.factura_number if inv else "-",
                "date": inv.date.isoformat() if inv else "-",
                "product": r.product.name if r.product else "-",
                "region": region_name,
                "med_rep": med_rep_name,
                "qty": r.quantity,
                "paid_ratio": round(paid_ratio * 100, 1),
                "gross_profit": round(float((unit_profit * r.quantity) * paid_ratio), 2),
                # For context: show formula breakdown
                "sale_price": round(float(sale_price), 2),
                "prod_price": round(float(prod_price), 2),
                "salary": round(float(salary), 2),
                "marketing": round(float(marketing), 2),
            })
        return res_payload

    return []

@router.get("/dashboard/director-report-excel")
async def get_director_report_excel(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    month: int = None,
    year: int = None
) -> Any:
    """
    Generates a high-fidelity Excel report for the Director comparing Plans vs. Facts.
    Uses direct aggregation from Plan and DoctorFactAssignment tables.
    """
    import io
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Border, Side, Alignment
    from openpyxl.utils import get_column_letter
    from fastapi.responses import StreamingResponse
    from app.models.crm import Doctor, MedicalOrganization, Region, DoctorSpecialty, DoctorCategory
    from app.models.product import Product
    from app.models.sales import Plan, DoctorFactAssignment
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select, and_
    
    if current_user.role not in [UserRole.INVESTOR, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not month:
        month = datetime.utcnow().month
    if not year:
        year = datetime.utcnow().year

    # 1. Fetch Products for columns
    products_res = await db.execute(select(Product).order_by(Product.name))
    products = products_res.scalars().all()
    product_count = len(products)
    
    # 2. Fetch all Doctors with related info
    doctors_res = await db.execute(
        select(Doctor)
        .options(
            selectinload(Doctor.med_org),
            selectinload(Doctor.region),
            selectinload(Doctor.specialty),
            selectinload(Doctor.category),
            selectinload(Doctor.assigned_rep).selectinload(User.manager).selectinload(User.manager)
        )
        .where(Doctor.is_active == True)
        .order_by(Doctor.full_name)
    )
    doctors = doctors_res.scalars().all()

    # 3. Fetch Plans for this month/year
    plans_res = await db.execute(
        select(Plan).where(
            and_(Plan.month == month, Plan.year == year)
        )
    )
    plans_list = plans_res.scalars().all()
    plan_map = {} # (doctor_id, product_id) -> qty
    for p in plans_list:
        if p.doctor_id:
            key = (p.doctor_id, p.product_id)
            plan_map[key] = plan_map.get(key, 0) + (p.target_quantity or 0)

    # 4. Fetch Facts for this month/year
    facts_res = await db.execute(
        select(DoctorFactAssignment).where(
            and_(DoctorFactAssignment.month == month, DoctorFactAssignment.year == year)
        )
    )
    facts_list = facts_res.scalars().all()
    fact_map = {} # (doctor_id, product_id) -> qty
    for f in facts_list:
        key = (f.doctor_id, f.product_id)
        fact_map[key] = fact_map.get(key, 0) + (f.quantity or 0)


    # 5. Create Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Report {month}-{year}"

    # Styles
    fill_blue = PatternFill(start_color="8DB4E2", end_color="8DB4E2", fill_type="solid")
    fill_green = PatternFill(start_color="92D050", end_color="92D050", fill_type="solid")
    fill_grey = PatternFill(start_color="BFBFBF", end_color="BFBFBF", fill_type="solid")
    
    font_bold = Font(bold=True, size=10)
    font_small = Font(size=8)
    border_thin = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_vertical = Alignment(text_rotation=90, horizontal='center', vertical='center')

    # Static Headers
    base_headers = [
        "Продукт Менеджер", "РМ/МП", "ФИО Врача", "Контакт врача", 
        "Специальность", "ЛПУ", "Регион", "Категория вр."
    ]
    
    # Setup Headers
    for i, h in enumerate(base_headers, 1):
        cell = ws.cell(row=1, column=i, value=h)
        cell.alignment = align_vertical
        cell.font = font_bold
        cell.border = border_thin
        cell.fill = fill_blue
        ws.merge_cells(start_row=1, start_column=i, end_row=3, end_column=i)

    start_plan_col = 9
    end_plan_col = 8 + product_count + 1 
    ws.merge_cells(start_row=1, start_column=start_plan_col, end_row=1, end_column=end_plan_col)
    cell_plan_title = ws.cell(row=1, column=start_plan_col, value="План продаж")
    cell_plan_title.fill = fill_green
    cell_plan_title.alignment = align_center
    cell_plan_title.font = font_bold
    cell_plan_title.border = border_thin

    for i, p in enumerate(products, 0):
        col = start_plan_col + i
        cell = ws.cell(row=2, column=col, value=p.name)
        cell.alignment = align_vertical
        cell.font = font_small
        cell.border = border_thin
        cell.fill = fill_green
        ws.merge_cells(start_row=2, start_column=col, end_row=3, end_column=col)

    col_sum_plan = start_plan_col + product_count
    cell_sum_plan = ws.cell(row=2, column=col_sum_plan, value="СУММА")
    cell_sum_plan.alignment = align_vertical
    cell_sum_plan.font = font_bold
    cell_sum_plan.fill = fill_green
    ws.merge_cells(start_row=2, start_column=col_sum_plan, end_row=3, end_column=col_sum_plan)

    start_fact_col = end_plan_col + 1
    end_fact_col = start_fact_col + product_count 
    ws.merge_cells(start_row=1, start_column=start_fact_col, end_row=1, end_column=end_fact_col)
    cell_fact_title = ws.cell(row=1, column=start_fact_col, value="Фактическая реализация")
    cell_fact_title.fill = fill_grey
    cell_fact_title.alignment = align_center
    cell_fact_title.font = font_bold
    cell_fact_title.border = border_thin

    for i, p in enumerate(products, 0):
        col = start_fact_col + i
        cell = ws.cell(row=2, column=col, value=p.name)
        cell.alignment = align_vertical
        cell.font = font_small
        cell.border = border_thin
        cell.fill = fill_grey
        ws.merge_cells(start_row=2, start_column=col, end_row=3, end_column=col)

    col_sum_fact = start_fact_col + product_count
    cell_sum_fact = ws.cell(row=2, column=col_sum_fact, value="СУММА")
    cell_sum_fact.alignment = align_vertical
    cell_sum_fact.font = font_bold
    cell_sum_fact.fill = fill_grey
    ws.merge_cells(start_row=2, start_column=col_sum_fact, end_row=3, end_column=col_sum_fact)

    # 6. Fill Data
    row_idx = 4
    for doc in doctors:
        pm_name = ""
        rm_name = ""
        if doc.assigned_rep:
            rm_name = doc.assigned_rep.full_name
            # Try to find PM in hierarchy
            mgr = doc.assigned_rep.manager
            for _ in range(3):
                if not mgr: break
                if mgr.role == UserRole.PRODUCT_MANAGER:
                    pm_name = mgr.full_name
                    break
                mgr = mgr.manager if hasattr(mgr, 'manager') else None

        ws.cell(row=row_idx, column=1, value=pm_name).border = border_thin
        ws.cell(row=row_idx, column=2, value=rm_name).border = border_thin
        ws.cell(row=row_idx, column=3, value=doc.full_name).border = border_thin
        ws.cell(row=row_idx, column=4, value=doc.contact1).border = border_thin
        ws.cell(row=row_idx, column=5, value=doc.specialty.name if doc.specialty else "").border = border_thin
        ws.cell(row=row_idx, column=6, value=doc.med_org.name if doc.med_org else "").border = border_thin
        ws.cell(row=row_idx, column=7, value=doc.region.name if doc.region else "").border = border_thin
        ws.cell(row=row_idx, column=8, value=doc.category.name if doc.category else "").border = border_thin

        row_total_plan = 0
        for i, p in enumerate(products):
            val = plan_map.get((doc.id, p.id), 0)
            row_total_plan += val
            ws.cell(row=row_idx, column=start_plan_col + i, value=val).border = border_thin
        ws.cell(row=row_idx, column=col_sum_plan, value=row_total_plan).border = border_thin

        row_total_fact = 0
        for i, p in enumerate(products):
            val = fact_map.get((doc.id, p.id), 0)
            row_total_fact += val
            ws.cell(row=row_idx, column=start_fact_col + i, value=val).border = border_thin
        ws.cell(row=row_idx, column=col_sum_fact, value=row_total_fact).border = border_thin

        row_idx += 1

    # Format
    for i in range(1, 9): ws.column_dimensions[get_column_letter(i)].width = 15
    for i in range(9, end_fact_col + 1): ws.column_dimensions[get_column_letter(i)].width = 5

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"Director_Report_{year}_{month}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
