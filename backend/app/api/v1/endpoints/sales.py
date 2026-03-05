from typing import Any, List, Optional, Dict
import io
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_sales
from app.models.user import User, UserRole
from app.schemas.sales import (
    Plan, PlanCreate, 
    Reservation, ReservationCreate, ReservationUpdate,
    Invoice, Payment, PaymentCreate,
    DoctorFactAssignment, DoctorFactAssignmentCreate, SaleFact,
    BonusPayment, BonusPaymentCreate, BonusPaymentUpdate
)

router = APIRouter()

# Plans
@router.post("/plans/", response_model=Plan)
async def create_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    plan_in: PlanCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    plan = await crud_sales.create_plan(db, obj_in=plan_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Plan", plan.id,
        f"Plan yaratildi: {plan.target_quantity} dona, Oy: {plan.month}/{plan.year}",
        request
    )
    return plan

@router.get("/plans/", response_model=List[Plan])
async def read_plans(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    month: int = None,
    year: int = None,
    med_rep_id: int = None,
    doctor_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_plans(db, skip=skip, limit=limit, month=month, year=year, med_rep_id=med_rep_id, doctor_id=doctor_id)

@router.put("/plans/{id}", response_model=Plan)
async def update_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    plan_in: dict,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    plan = await crud_sales.get_plan(db, id=id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    updated_plan = await crud_sales.update_plan(db, db_obj=plan, obj_in=plan_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "UPDATE", "Plan", updated_plan.id,
        f"Plan tahrirlandi: ID {id}",
        request
    )
    return updated_plan

@router.delete("/plans/{id}")
async def delete_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    plan = await crud_sales.get_plan(db, id=id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await crud_sales.delete_plan(db, id=id)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "DELETE", "Plan", id,
        f"Plan o'chirildi: ID {id}",
        request
    )
    return {"ok": True}


# Reservations (Bron)
@router.post("/reservations/", response_model=Reservation)
async def create_reservation(
    *,
    db: AsyncSession = Depends(deps.get_db),
    reservation_in: ReservationCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    reservation = await crud_sales.create_reservation(db, obj_in=reservation_in, user_id=current_user.id)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Reservation", reservation.id,
        f"Bron yaratildi: ID {reservation.id}, Summa: {getattr(reservation, 'total_amount', 0) or 0:,.0f} UZS",
        request
    )
    return reservation

@router.get("/reservations/", response_model=List[Reservation])
async def read_reservations(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_reservations(db, skip=skip, limit=limit)

@router.patch("/reservations/{id}/status", response_model=Reservation)
async def update_reservation_status(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    status_update: ReservationUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    reservation = await crud_sales.get_reservation(db, id=id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    updated_reservation = await crud_sales.update_reservation_status(db, db_obj=reservation, status=status_update.status)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "UPDATE_STATUS", "Reservation", id,
        f"Bron holati o'zgartirildi: {status_update.status}",
        request
    )
    return updated_reservation

# Invoices (Factura)
@router.post("/reservations/{id}/return", response_model=Reservation)
async def map_return_reservation_items(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    return_in: "ReservationReturnCreate",
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    from app.schemas.sales import ReservationReturnCreate
    reservation = await crud_sales.return_reservation_items(
        db=db, 
        reservation_id=id, 
        obj_in=return_in, 
        user_id=current_user.id
    )
    from app.services.audit_service import log_action
    items_count = sum(r.quantity for r in return_in.items)
    await log_action(
        db, current_user, "RETURN", "Reservation", id,
        f"Bron bo'yicha vozvrat qilindi: {items_count} ta mahsulot qaytdi.",
        request
    )
    return reservation

# Invoices (Factura)
@router.get("/invoices/", response_model=List[Invoice])
async def read_invoices(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_invoices(db, skip=skip, limit=limit)

# Payments
@router.post("/payments/", response_model=Payment)
async def create_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    payment = await crud_sales.create_payment(db, obj_in=payment_in, user_id=current_user.id)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "Payment", payment.id,
        f"To'lov qabul qilindi: {payment.amount:,.0f} UZS, Turi: {payment.type}",
        request
    )
    return payment

# Facts & Doctor Assignments
@router.get("/facts/", response_model=List[SaleFact])
async def read_facts(
    db: AsyncSession = Depends(deps.get_db),
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_facts(db, med_rep_id=med_rep_id)

@router.get("/doctor-facts/", response_model=List[DoctorFactAssignment])
async def read_doctor_facts(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_doctor_fact_assignments(
        db, skip=skip, limit=limit, med_rep_id=med_rep_id
    )

@router.post("/doctor-facts/", response_model=DoctorFactAssignment)
async def create_doctor_fact(
    *,
    db: AsyncSession = Depends(deps.get_db),
    fact_in: DoctorFactAssignmentCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    fact = await crud_sales.create_doctor_fact_assignment(db, obj_in=fact_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "DoctorFact", fact.id,
        f"Vrach fakti biriktirildi: {fact.quantity} dona",
        request
    )
    return fact

# Bonus Payments
@router.get("/bonus-payments/", response_model=List[BonusPayment])
async def read_bonus_payments(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    med_rep_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_sales.get_bonus_payments(
        db, skip=skip, limit=limit, med_rep_id=med_rep_id
    )

@router.post("/bonus-payments/", response_model=BonusPayment)
async def create_bonus_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: BonusPaymentCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    allowed_roles = {UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Only Deputy Director or higher can record bonus payments"
        )
    payment = await crud_sales.create_bonus_payment(db, obj_in=payment_in)
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "CREATE", "BonusPayment", payment.id,
        f"Bonus to'landi: {payment.amount:,.0f} UZS",
        request
    )
    return payment

@router.patch("/bonus-payments/{payment_id}/", response_model=BonusPayment)
async def update_bonus_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_id: int,
    payment_in: BonusPaymentUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    allowed_roles = {UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await crud_sales.update_bonus_payment(db, payment_id=payment_id, obj_in=payment_in)
    if not result:
        raise HTTPException(status_code=404, detail="Bonus payment not found")
    
    from app.services.audit_service import log_action
    await log_action(
        db, current_user, "UPDATE", "BonusPayment", result.id,
        f"Bonus to'lovi tahrirlandi: ID {payment_id}",
        request
    )
    return result

import io
from fastapi.responses import StreamingResponse

@router.get("/reservations/{id}/export")
async def export_reservation_excel(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
):
    import openpyxl
    import traceback
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    
    try:
        reservation = await crud_sales.get_reservation(db, id=id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
            
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Фактура"
        
        # Yellow fill
        fill_yellow = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")
        fill_blue = PatternFill(start_color="B4C6E7", end_color="B4C6E7", fill_type="solid")
        fill_pink = PatternFill(start_color="E6B8B7", end_color="E6B8B7", fill_type="solid")
        
        font_bold = Font(bold=True)
        border_thin = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        
        # 1. Харажатлардан кейин Фойда/Зарар (Shifting to column 4 - Column D)
        ws.cell(row=1, column=4, value="Харажатлардан кейин Фойда/Зарар").font = font_bold
        ws.cell(row=2, column=4, value="Клинт бонуси")
        ws.cell(row=2, column=5, value=0).fill = fill_yellow
        ws.cell(row=3, column=4, value="Менеджерлар бонуси")
        ws.cell(row=4, column=4, value="Прямой").font = font_bold
        ws.cell(row=4, column=5).fill = fill_yellow
        ws.cell(row=5, column=4, value="Доставка")
        ws.cell(row=5, column=5).fill = fill_yellow
        
        org_name = reservation.med_org.name if reservation.med_org else (reservation.customer_name or "N/A")
        org_inn = reservation.med_org.inn if reservation.med_org and reservation.med_org.inn else ""
        
        ws.cell(row=6, column=4, value="КОРХОНА НОМИ").fill = fill_blue
        ws.cell(row=6, column=5, value=org_name).fill = fill_blue
        ws.merge_cells(start_row=6, start_column=5, end_row=6, end_column=8)
        
        ws.cell(row=7, column=4, value="ИНН").fill = fill_blue
        ws.cell(row=7, column=5, value=org_inn).fill = fill_blue
        ws.merge_cells(start_row=7, start_column=5, end_row=7, end_column=8)
        
        headers = ["№", "Наименование", "Кол-во", "Цена", "Завода келишилган", "Сумма"]
        for i, header in enumerate(headers):
            col_idx = i + 3 # Start from C
            cell = ws.cell(row=8, column=col_idx, value=header)
            cell.border = border_thin
            cell.alignment = Alignment(horizontal='center', vertical='center')
            if col_idx == 7: # "Завода келишилган"
                cell.fill = fill_pink
            else:
                cell.fill = fill_blue
            
        # Column widths (Shifting A->C, B->D, etc.)
        ws.column_dimensions['C'].width = 5
        ws.column_dimensions['D'].width = 40
        ws.column_dimensions['E'].width = 10
        ws.column_dimensions['F'].width = 15
        ws.column_dimensions['G'].width = 20
        ws.column_dimensions['H'].width = 15
        
        subtotal_plain = 0.0
        row_idx = 9
        for idx, item in enumerate(reservation.items, 1):
            actual_qty = (item.quantity or 0) - (item.returned_quantity or 0)
            if actual_qty <= 0:
                continue
                
            item_price = item.price or 0.0
            # Plain amount for the row (qty * price)
            plain_amount = actual_qty * item_price
            subtotal_plain += plain_amount
            
            ws.cell(row=row_idx, column=3, value=idx).border = border_thin
            
            cell_name = ws.cell(row=row_idx, column=4, value=item.product.name if item.product else "")
            cell_name.border = border_thin
            cell_name.fill = fill_yellow
            
            cell_qty = ws.cell(row=row_idx, column=5, value=actual_qty)
            cell_qty.border = border_thin
            cell_qty.fill = fill_yellow
            cell_qty.alignment = Alignment(horizontal='center')
            
            cell_price = ws.cell(row=row_idx, column=6, value=item_price)
            cell_price.border = border_thin
            cell_price.fill = fill_yellow
            cell_price.alignment = Alignment(horizontal='center')
            
            # Завода келишилган (production price)
            prod_price = item.product.production_price if item.product else 0
            cell_prod = ws.cell(row=row_idx, column=7, value=prod_price)
            cell_prod.border = border_thin
            cell_prod.fill = fill_pink
            cell_prod.alignment = Alignment(horizontal='center')
            
            cell_sum = ws.cell(row=row_idx, column=8, value=plain_amount)
            cell_sum.border = border_thin
            cell_sum.fill = fill_yellow
            cell_sum.alignment = Alignment(horizontal='right')
            row_idx += 1
            
        # Add 4 extra empty rows (as requested)
        for _ in range(4):
            for col_idx in range(3, 9): # Columns C to H
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.border = border_thin
            row_idx += 1
            
        # Totals
        discount_val = 0.0
        if reservation.items and len(reservation.items) > 0:
            discount_val = reservation.items[0].discount_percent or 0.0
            
        discounted_total = subtotal_plain * (1 - discount_val / 100.0)
        nds_percent = reservation.nds_percent or 0.0
        nds_total = discounted_total * (1 + nds_percent / 100.0)
        
        cell_sub = ws.cell(row=row_idx, column=8, value=subtotal_plain)
        cell_sub.font = font_bold
        cell_sub.alignment = Alignment(horizontal='right')
        
        label_disc = ws.cell(row=row_idx + 1, column=7, value=f"{discount_val}% скидка билан")
        label_disc.alignment = Alignment(horizontal='right')
        cell_disc = ws.cell(row=row_idx + 1, column=8, value=discounted_total)
        cell_disc.font = font_bold
        cell_disc.alignment = Alignment(horizontal='right')
        
        label_nds = ws.cell(row=row_idx + 2, column=7, value=f"{nds_percent}% ндс билан")
        label_nds.alignment = Alignment(horizontal='right')
        cell_nds = ws.cell(row=row_idx + 2, column=8, value=nds_total)
        cell_nds.font = font_bold
        cell_nds.alignment = Alignment(horizontal='right')
        
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        
        filename = f"Factura_{reservation.id}.xlsx"
        return StreamingResponse(
            stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error exporting reservation {id}: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
