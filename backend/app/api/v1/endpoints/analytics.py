from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api import deps
from app.models.user import User, UserRole
from app.models.ledger import DoctorMonthlyStat
from datetime import datetime

router = APIRouter()

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
    from sqlalchemy import and_
    from app.models.sales import Invoice, Payment, Reservation, ReservationItem
    from app.models.ledger import BonusLedger, LedgerType
    from app.models.crm import MedicalOrganization
    
    if current_user.role not in [
        UserRole.INVESTOR,
        UserRole.DIRECTOR, 
        UserRole.DEPUTY_DIRECTOR, 
        UserRole.PRODUCT_MANAGER, 
        UserRole.FIELD_FORCE_MANAGER, 
        UserRole.REGIONAL_MANAGER,
        UserRole.HEAD_OF_WAREHOUSE,
        UserRole.ADMIN
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

        # Calculate previous period boundaries
        if month == 1:
            prev_m, prev_y = 12, year - 1
        else:
            prev_m, prev_y = month - 1, year
        prev_start_date = datetime(prev_y, prev_m, 1)
        
        if prev_m == 12:
            prev_end_date = datetime(prev_y + 1, 1, 1)
        else:
            prev_end_date = datetime(prev_y, prev_m + 1, 1)
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
    final_region_ids = [region_id] if region_id else allowed_region_ids
    if current_user.role == UserRole.REGIONAL_MANAGER and not final_region_ids:
        # RM must have at least one region, otherwise no data
        final_region_ids = [-1]

    # Calculate previous period boundaries
    if month == 1:
        prev_m, prev_y = 12, year - 1
    else:
        prev_m, prev_y = month - 1, year
    prev_start_date = datetime(prev_y, prev_m, 1)
    
    if prev_m == 12:
        prev_end_date = datetime(prev_y + 1, 1, 1)
    else:
        prev_end_date = datetime(prev_y, prev_m + 1, 1)

    # Helper to build core queries
    from app.models.sales import InvoiceStatus
    def build_queries(start_tgt, end_tgt):
        _rev = select(func.sum(Payment.amount))
        if start_tgt and end_tgt:
            _rev = _rev.where(and_(Payment.date >= start_tgt, Payment.date < end_tgt))
            
        _bonus = select(func.sum(BonusLedger.amount)).where(
            BonusLedger.ledger_type == LedgerType.ACCRUAL,
        )
        if start_tgt and end_tgt:
            _bonus = _bonus.where(and_(BonusLedger.created_at >= start_tgt, BonusLedger.created_at < end_tgt))
            
        _qty = select(func.sum(ReservationItem.quantity)).join(
            Reservation, ReservationItem.reservation_id == Reservation.id
        ).join(
            Invoice, Invoice.reservation_id == Reservation.id
        )
        if start_tgt and end_tgt:
            _qty = _qty.where(and_(Invoice.date >= start_tgt, Invoice.date < end_tgt))
            
        # Debt is total up to the given end date (or current if global)
        _debt = select(func.sum(Invoice.total_amount - Invoice.paid_amount)).where(
            Invoice.status != InvoiceStatus.CANCELLED
        )
        if end_tgt:
            _debt = _debt.where(Invoice.date < end_tgt)
            
        return _rev, _bonus, _qty, _debt

    curr_rev_q, curr_bonus_q, curr_qty_q, curr_debt_q = build_queries(start_date, end_date)
    prev_rev_q, prev_bonus_q, prev_qty_q, prev_debt_q = build_queries(prev_start_date, prev_end_date)
    
    # Apply hierarchy filter if not director/admin
    is_team_manager = current_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]
    
    if is_team_manager:
        from app.crud.crud_user import get_descendant_ids
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids:
            rep_ids = [-1]
        
        def apply_team(_rq, _bq, _qq, _dq):
            _rq = _rq.join(Invoice, Payment.invoice_id == Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id.in_(rep_ids))
            _bq = _bq.where(BonusLedger.user_id.in_(rep_ids))
            _qq = _qq.where(Reservation.created_by_id.in_(rep_ids))
            _dq = _dq.join(Reservation, Invoice.reservation_id == Reservation.id).where(Reservation.created_by_id.in_(rep_ids))
            return _rq, _bq, _qq, _dq
            
        curr_rev_q, curr_bonus_q, curr_qty_q, curr_debt_q = apply_team(curr_rev_q, curr_bonus_q, curr_qty_q, curr_debt_q)
        prev_rev_q, prev_bonus_q, prev_qty_q, prev_debt_q = apply_team(prev_rev_q, prev_bonus_q, prev_qty_q, prev_debt_q)

    # Apply region filter
    if final_region_ids:
        def apply_region(_rq, _qq, _dq):
            if not is_team_manager:
                _rq = _rq.join(Invoice, Payment.invoice_id == Invoice.id).join(Reservation, Invoice.reservation_id == Reservation.id)
                _dq = _dq.join(Reservation, Invoice.reservation_id == Reservation.id)
            _rq = _rq.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
            _qq = _qq.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
            _dq = _dq.join(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id).where(MedicalOrganization.region_id.in_(final_region_ids))
            return _rq, _qq, _dq
            
        curr_rev_q, curr_qty_q, curr_debt_q = apply_region(curr_rev_q, curr_qty_q, curr_debt_q)
        prev_rev_q, prev_qty_q, prev_debt_q = apply_region(prev_rev_q, prev_qty_q, prev_debt_q)

    # Executing Current
    c_rev = (await db.execute(curr_rev_q)).scalar() or 0.0
    c_bon = (await db.execute(curr_bonus_q)).scalar() or 0.0
    c_qty = (await db.execute(curr_qty_q)).scalar() or 0
    c_debt = (await db.execute(curr_debt_q)).scalar() or 0.0
    
    # Executing Previous
    p_rev = (await db.execute(prev_rev_q)).scalar() or 0.0
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
    if current_user.role in [UserRole.DIRECTOR, UserRole.INVESTOR, UserRole.ADMIN]:
        # Latest Payments
        recent_payments = (await db.execute(
            select(Payment).order_by(Payment.date.desc()).limit(3)
        )).scalars().all()
        for p in recent_payments:
            activities.append({
                "title": "Оплата фактуры",
                "desc": p.comment or "Поступление средств",
                "amount": f"+{p.amount:,.0f} UZS",
                "time": p.date.strftime("%d.%m.%Y %H:%M"),
                "color": "green",
                "dt": p.date
            })
            
        # Latest Invoices
        recent_invoices = (await db.execute(
            select(Invoice).order_by(Invoice.date.desc()).limit(3)
        )).scalars().all()
        for i in recent_invoices:
            activities.append({
                "title": "Новая фактура",
                "desc": f"Фактура №{i.factura_number or i.id}",
                "amount": f"{i.total_amount:,.0f} UZS",
                "time": i.date.strftime("%d.%m.%Y %H:%M"),
                "color": "blue",
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
