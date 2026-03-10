from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.sales import (
    Plan, Reservation, ReservationItem, Invoice, Payment,
    ReservationStatus, InvoiceStatus, DoctorFactAssignment, BonusPayment
)
from app.schemas.sales import (
    PlanCreate, ReservationCreate, ReservationUpdate, PaymentCreate,
    DoctorFactAssignmentCreate, BonusPaymentCreate, ReservationDataUpdate
)
from app.models.product import Product
from app.models.crm import Doctor, MedicalOrganization
from app.models.warehouse import Warehouse

async def create_plan(db: AsyncSession, obj_in: PlanCreate) -> Plan:
    # Check if a plan already exists for this exact combination
    query = select(Plan).where(
        Plan.med_rep_id == obj_in.med_rep_id,
        Plan.product_id == obj_in.product_id,
        Plan.month == obj_in.month,
        Plan.year == obj_in.year
    )
    
    # Also match doctor_id and med_org_id exactly (could be None)
    if obj_in.doctor_id is not None:
        query = query.where(Plan.doctor_id == obj_in.doctor_id)
    else:
        query = query.where(Plan.doctor_id.is_(None))
        
    if obj_in.med_org_id is not None:
        query = query.where(Plan.med_org_id == obj_in.med_org_id)
    else:
        query = query.where(Plan.med_org_id.is_(None))

    result = await db.execute(query)
    existing_plan = result.scalars().first()
    
    if existing_plan:
        existing_plan.target_quantity += obj_in.target_quantity
        existing_plan.target_amount += obj_in.target_amount
        await db.commit()
        plan_id = existing_plan.id
    else:
        db_obj = Plan(**obj_in.dict())
        db.add(db_obj)
        await db.commit()
        plan_id = db_obj.id

    # Fetch with relationships loaded to satisfy Pydantic schema
    stmt = select(Plan).options(
        selectinload(Plan.med_org),
        selectinload(Plan.doctor).selectinload(Doctor.region),
        selectinload(Plan.doctor).selectinload(Doctor.specialty),
        selectinload(Plan.doctor).selectinload(Doctor.category),
        selectinload(Plan.doctor).selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps),
        selectinload(Plan.doctor).selectinload(Doctor.assigned_rep),
        selectinload(Plan.product).selectinload(Product.category),
        selectinload(Plan.product).selectinload(Product.manufacturers),
        selectinload(Plan.med_rep)
    ).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    return res.scalars().first()

async def get_plans(db: AsyncSession, skip: int = 0, limit: int = 100, month: int = None, year: int = None, med_rep_id: int = None, doctor_id: int = None) -> List[Plan]:
    # Subquery to calculate total quantity from DoctorFactAssignment for each plan
    fact_subquery = select(func.coalesce(func.sum(DoctorFactAssignment.quantity), 0)).where(
        DoctorFactAssignment.med_rep_id == Plan.med_rep_id,
        DoctorFactAssignment.doctor_id == Plan.doctor_id,
        DoctorFactAssignment.product_id == Plan.product_id,
        DoctorFactAssignment.month == Plan.month,
        DoctorFactAssignment.year == Plan.year
    ).scalar_subquery().label("fact_quantity")

    query = select(Plan, fact_subquery).options(
        selectinload(Plan.med_org),
        selectinload(Plan.doctor).selectinload(Doctor.region),
        selectinload(Plan.doctor).selectinload(Doctor.specialty),
        selectinload(Plan.doctor).selectinload(Doctor.category),
        selectinload(Plan.doctor).selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps),
        selectinload(Plan.doctor).selectinload(Doctor.assigned_rep),
        selectinload(Plan.product).selectinload(Product.category),
        selectinload(Plan.product).selectinload(Product.manufacturers),
        selectinload(Plan.med_rep)
    ).offset(skip).limit(limit)
    
    if month:
        query = query.where(Plan.month == month)
    if year:
        query = query.where(Plan.year == year)
    if med_rep_id:
        query = query.where(Plan.med_rep_id == med_rep_id)
    if doctor_id:
        query = query.where(Plan.doctor_id == doctor_id)
        
    result = await db.execute(query)
    rows = result.all()
    
    plans = []
    for plan_obj, fact_qty in rows:
        plan_obj.fact_quantity = fact_qty
        plans.append(plan_obj)
        
    return plans

async def get_plan(db: AsyncSession, id: int) -> Optional[Plan]:
    query = select(Plan).options(
        selectinload(Plan.med_org),
        selectinload(Plan.doctor).selectinload(Doctor.region),
        selectinload(Plan.doctor).selectinload(Doctor.specialty),
        selectinload(Plan.doctor).selectinload(Doctor.category),
        selectinload(Plan.doctor).selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps),
        selectinload(Plan.doctor).selectinload(Doctor.assigned_rep),
        selectinload(Plan.product).selectinload(Product.category),
        selectinload(Plan.product).selectinload(Product.manufacturers),
        selectinload(Plan.med_rep)
    ).where(Plan.id == id)
    result = await db.execute(query)
    return result.scalars().first()

async def update_plan(db: AsyncSession, db_obj: Plan, obj_in: dict) -> Plan:
    for field in obj_in:
        if hasattr(db_obj, field) and obj_in[field] is not None:
            setattr(db_obj, field, obj_in[field])
    
    await db.commit()
    return await get_plan(db, id=db_obj.id)

async def delete_plan(db: AsyncSession, id: int) -> bool:
    plan = await get_plan(db, id=id)
    if not plan:
        return False
    await db.delete(plan)
    await db.commit()
    return True

# Reservations
async def create_reservation(db: AsyncSession, obj_in: ReservationCreate, user_id: int) -> Reservation:
    # Calculate total amount
    total_amount = 0.0
    items_db = []
    
    for item in obj_in.items:
        # Calculate item total: (price * qty) * (1 - discount/100)
        item_total = (item.price * item.quantity) * (1 - item.discount_percent / 100.0)
        total_amount += item_total
        
        db_item = ReservationItem(
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            discount_percent=item.discount_percent,
            total_price=item_total
        )
        items_db.append(db_item)

    # Apply NDS
    nds_multiplier = 1 + (obj_in.nds_percent / 100.0)
    total_amount = total_amount * nds_multiplier

    db_obj = Reservation(
        created_by_id=user_id,
        customer_name=obj_in.customer_name,
        med_org_id=obj_in.med_org_id,
        warehouse_id=obj_in.warehouse_id if hasattr(obj_in, 'warehouse_id') else None,
        description=obj_in.description,
        validity_date=obj_in.validity_date,
        is_bonus_eligible=obj_in.is_bonus_eligible,
        nds_percent=obj_in.nds_percent,
        total_amount=total_amount,
        status=ReservationStatus.PENDING,
        items=items_db
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_reservation(db, db_obj.id)

async def get_reservation(db: AsyncSession, id: int) -> Optional[Reservation]:
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
            selectinload(Reservation.created_by),
            selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by)
        )
        .where(Reservation.id == id)
    )
    return result.scalars().first()

async def get_reservations(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Reservation]:
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
            selectinload(Reservation.created_by),
            selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by)
        )
        .order_by(Reservation.date.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_reservation_status(db: AsyncSession, db_obj: Reservation, status: ReservationStatus) -> Reservation:
    db_obj.status = status
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_reservation_data(db: AsyncSession, reservation_id: int, obj_in: ReservationDataUpdate) -> Optional[Reservation]:
    result = await db.execute(
        select(Reservation).options(
            selectinload(Reservation.created_by),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Reservation.warehouse),
            selectinload(Reservation.invoice).selectinload(Invoice.payments),
            selectinload(Reservation.items).selectinload(ReservationItem.product)
        ).where(Reservation.id == reservation_id)
    )
    reservation = result.scalars().first()
    if not reservation:
        return None
    
    # Ensure Invoice exists if we're updating invoice fields
    if not reservation.invoice and (obj_in.factura_number is not None or obj_in.realization_date is not None):
        reservation.invoice = Invoice(
            reservation_id=reservation.id,
            factura_number=f"INV-{reservation.id}-{int(datetime.now().timestamp())}",
            total_amount=reservation.total_amount,
            paid_amount=0
        )
        db.add(reservation.invoice)

    # Update Invoice fields
    if reservation.invoice:
        if obj_in.factura_number is not None:
            reservation.invoice.factura_number = obj_in.factura_number
        if obj_in.realization_date is not None:
            reservation.invoice.realization_date = obj_in.realization_date.replace(tzinfo=None)
            
    # Update ReservationItems discount
    if obj_in.discount_percent is not None:
        for item in reservation.items:
            item.discount_percent = obj_in.discount_percent
            # Recalculate total_price: price * quantity * (1 - discount/100)
            item.total_price = item.price * item.quantity * (1 - item.discount_percent / 100)
        
        # Recalculate reservation total_amount
        reservation.total_amount = sum(item.total_price for item in reservation.items)
        if reservation.invoice:
            reservation.invoice.total_amount = reservation.total_amount

    await db.commit()
    
    # Re-fetch with all relationships to ensure serialization works
    result = await db.execute(
        select(Reservation).options(
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
            selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
            selectinload(Reservation.created_by),
            selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Reservation.invoice).selectinload(Invoice.payments).selectinload(Payment.processed_by)
        ).where(Reservation.id == reservation_id)
    )
    return result.scalars().first()

# Invoices
async def get_invoices(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Invoice]:
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.payments).selectinload(Payment.processed_by),
            selectinload(Invoice.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.manufacturers),
            selectinload(Invoice.reservation).selectinload(Reservation.items).selectinload(ReservationItem.product).selectinload(Product.category),
            selectinload(Invoice.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.region),
            selectinload(Invoice.reservation).selectinload(Reservation.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Invoice.reservation).selectinload(Reservation.warehouse).selectinload(Warehouse.stocks),
            selectinload(Invoice.reservation).selectinload(Reservation.created_by)
        )
        .order_by(Invoice.date.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

# Payments
async def create_payment(db: AsyncSession, obj_in: PaymentCreate, user_id: int) -> Payment:
    db_obj = Payment(**obj_in.dict(), processed_by_id=user_id)
    db.add(db_obj)
    
    # Update Invoice paid_amount and status
    result = await db.execute(select(Invoice).where(Invoice.id == obj_in.invoice_id))
    invoice = result.scalars().first()
    if invoice:
        invoice.paid_amount += obj_in.amount
        if invoice.paid_amount >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID
        elif invoice.paid_amount > 0:
            invoice.status = InvoiceStatus.PARTIAL
    
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Facts
async def get_facts(db: AsyncSession, med_rep_id: Optional[int] = None) -> List[dict]:
    query = select(Reservation).options(
        selectinload(Reservation.items),
        selectinload(Reservation.invoice)
    ).where(Reservation.invoice.has())
    
    if med_rep_id:
        query = query.where(Reservation.created_by_id == med_rep_id)
        
    result = await db.execute(query)
    reservations = result.scalars().all()
    
    facts = []
    fact_id_counter = 1
    for res in reservations:
        if not res.invoice or res.invoice.total_amount == 0:
            continue
            
        paid_ratio = res.invoice.paid_amount / res.invoice.total_amount
        if paid_ratio <= 0:
            continue
            
        for item in res.items:
            paid_qty = item.quantity * paid_ratio
            paid_amt = item.total_price * paid_ratio
            
            facts.append({
                "id": fact_id_counter,
                "med_rep_id": res.created_by_id,
                "doctor_id": None,
                "product_id": item.product_id,
                "date": res.invoice.date.isoformat(),
                "amount": paid_amt,
                "quantity": int(paid_qty)
            })
            fact_id_counter += 1
            
    # Also fetch doctor fact assignments
    query_assignments = select(DoctorFactAssignment).options(
        selectinload(DoctorFactAssignment.product)
    )
    if med_rep_id:
        query_assignments = query_assignments.where(DoctorFactAssignment.med_rep_id == med_rep_id)
    
    res_assignments = await db.execute(query_assignments)
    assignments = res_assignments.scalars().all()
    
    # Each assignment is basically a fact transferred to a doctor. We can add them as separate facts
    for a in assignments:
        if a.amount is not None:
            fact_amount = a.amount
        else:
            product_price = a.product.price if a.product else 0.0
            fact_amount = product_price * a.quantity

        facts.append({
            "id": fact_id_counter,
            "med_rep_id": a.med_rep_id,
            "doctor_id": a.doctor_id,
            "product_id": a.product_id,
            "date": a.created_at.isoformat(),
            "month": a.month,
            "year": a.year,
            "amount": float(fact_amount),
            "quantity": a.quantity
        })
        fact_id_counter += 1
        
    return facts

# DoctorFactAssignments
async def create_doctor_fact_assignment(db: AsyncSession, obj_in: DoctorFactAssignmentCreate) -> DoctorFactAssignment:
    # If amount is not provided, fallback to standard product price
    amount = obj_in.amount
    if amount is None:
        from app.models.product import Product
        product = await db.execute(select(Product).where(Product.id == obj_in.product_id))
        product_obj = product.scalar_one_or_none()
        if product_obj:
            amount = product_obj.price * obj_in.quantity

    db_obj = DoctorFactAssignment(
        med_rep_id=obj_in.med_rep_id,
        doctor_id=obj_in.doctor_id,
        product_id=obj_in.product_id,
        quantity=obj_in.quantity,
        amount=amount,
        month=obj_in.month,
        year=obj_in.year
    )
    db.add(db_obj)
    await db.commit()
    from app.models.product import Product
    query = select(DoctorFactAssignment).options(
        selectinload(DoctorFactAssignment.product).selectinload(Product.category),
        selectinload(DoctorFactAssignment.product).selectinload(Product.manufacturers)
    ).where(DoctorFactAssignment.id == db_obj.id)
    result = await db.execute(query)
    return result.scalar_one()

async def get_doctor_fact_assignments(
    db: AsyncSession, skip: int = 0, limit: int = 100, med_rep_id: Optional[int] = None, doctor_id: Optional[int] = None
) -> List[DoctorFactAssignment]:
    from app.models.product import Product
    query = select(DoctorFactAssignment).options(
        selectinload(DoctorFactAssignment.product).selectinload(Product.category),
        selectinload(DoctorFactAssignment.product).selectinload(Product.manufacturers)
    ).offset(skip).limit(limit)
    if med_rep_id:
        query = query.where(DoctorFactAssignment.med_rep_id == med_rep_id)
    if doctor_id:
        query = query.where(DoctorFactAssignment.doctor_id == doctor_id)
    result = await db.execute(query)
    return result.scalars().all()

async def return_reservation_items(db: AsyncSession, reservation_id: int, obj_in: "ReservationReturnCreate", user_id: int):
    from app.models.sales import ReservationStatus, Reservation, ReservationItem, InvoiceStatus, UnassignedSale
    from app.models.crm import MedicalOrganizationStock
    from app.models.warehouse import Stock, StockMovement, StockMovementType
    from fastapi import HTTPException
    
    # 1. Get Reservation
    query = select(Reservation).options(
        selectinload(Reservation.items),
        selectinload(Reservation.invoice)
    ).where(Reservation.id == reservation_id)
    result = await db.execute(query)
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    # Process returns
    returned_amount_total = 0.0
    for return_req in obj_in.items:
        # Find the item
        res_item = next((item for item in reservation.items if item.product_id == return_req.product_id), None)
        if not res_item:
            continue
            
        if return_req.quantity <= 0:
            continue
            
        # Ensure we don't return more than what was un-returned
        available_to_return = res_item.quantity - res_item.returned_quantity
        actual_return_qty = min(return_req.quantity, available_to_return)
        
        if actual_return_qty <= 0:
            continue
            
        res_item.returned_quantity += actual_return_qty
        
        # Calculate reduction in price
        reduction = (actual_return_qty * res_item.price) * (1 - res_item.discount_percent / 100)
        res_item.total_price -= reduction
        returned_amount_total += reduction
        
        # Return to Warehouse Stock
        if reservation.warehouse_id:
            stk_query = select(Stock).where(
                (Stock.warehouse_id == reservation.warehouse_id) & 
                (Stock.product_id == return_req.product_id)
            )
            stk_res = await db.execute(stk_query)
            warehouse_stock = stk_res.scalar_one_or_none()
            if warehouse_stock:
                warehouse_stock.quantity += actual_return_qty
                
                # Audit log movement
                movement = StockMovement(
                    stock_id=warehouse_stock.id,
                    movement_type=StockMovementType.RETURN,
                    quantity_change=actual_return_qty,
                    reference_id=reservation.id
                )
                db.add(movement)
                
        # Remove from MedicalOrganizationStock if approved
        if reservation.status == ReservationStatus.APPROVED and reservation.med_org_id:
            pharm_stk_query = select(MedicalOrganizationStock).where(
                (MedicalOrganizationStock.med_org_id == reservation.med_org_id) &
                (MedicalOrganizationStock.product_id == return_req.product_id)
            )
            pharm_stk_res = await db.execute(pharm_stk_query)
            pharm_stock = pharm_stk_res.scalar_one_or_none()
            if pharm_stock:
                pharm_stock.quantity -= actual_return_qty
                if pharm_stock.quantity < 0:
                    pharm_stock.quantity = 0

    # Apply global reductions
    if returned_amount_total > 0:
        deduction_with_nds = returned_amount_total * (1 + (reservation.nds_percent / 100.0))
        reservation.total_amount -= deduction_with_nds
        if reservation.invoice:
            reservation.invoice.total_amount -= deduction_with_nds
            # Update Invoice Status
            if reservation.invoice.paid_amount >= reservation.invoice.total_amount and reservation.invoice.total_amount > 0:
                reservation.invoice.status = InvoiceStatus.PAID
                
        # Update UnassignedSale records
        if reservation.invoice:
            unassigned_query = select(UnassignedSale).where(UnassignedSale.invoice_id == reservation.invoice.id)
            unassigned_res = await db.execute(unassigned_query)
            unassigned_sales = unassigned_res.scalars().all()
            for return_req in obj_in.items:
                usale = next((u for u in unassigned_sales if u.product_id == return_req.product_id), None)
                if usale:
                    usale.total_quantity -= return_req.quantity
                    if usale.total_quantity < 0:
                        usale.total_quantity = 0

    await db.commit()
    await db.refresh(reservation)
    return reservation

# Bonus Payments
async def create_bonus_payment(db: AsyncSession, obj_in: BonusPaymentCreate) -> BonusPayment:
    db_obj = BonusPayment(
        med_rep_id=obj_in.med_rep_id,
        doctor_id=obj_in.doctor_id,
        product_id=obj_in.product_id,
        amount=obj_in.amount,
        for_month=obj_in.for_month,
        for_year=obj_in.for_year,
        paid_date=obj_in.paid_date,
        notes=obj_in.notes
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_bonus_payments(
    db: AsyncSession, skip: int = 0, limit: int = 100, med_rep_id: Optional[int] = None
) -> List[BonusPayment]:
    query = (
        select(BonusPayment)
        .options(
            selectinload(BonusPayment.product),
            selectinload(BonusPayment.doctor),
        )
        .order_by(BonusPayment.paid_date.desc())
        .offset(skip)
        .limit(limit)
    )
    if med_rep_id:
        query = query.where(BonusPayment.med_rep_id == med_rep_id)
    result = await db.execute(query)
    return result.scalars().all()

async def update_bonus_payment(
    db: AsyncSession, payment_id: int, obj_in: "BonusPaymentUpdate"
) -> Optional[BonusPayment]:
    result = await db.execute(select(BonusPayment).where(BonusPayment.id == payment_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        return None
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
