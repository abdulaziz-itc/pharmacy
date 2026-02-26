from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.sales import (
    Plan, Reservation, ReservationItem, Invoice, Payment,
    ReservationStatus, InvoiceStatus, DoctorFactAssignment, BonusPayment
)
from app.schemas.sales import (
    PlanCreate, ReservationCreate, ReservationUpdate, PaymentCreate,
    DoctorFactAssignmentCreate, BonusPaymentCreate
)
from app.models.product import Product
from app.models.crm import Doctor, MedicalOrganization

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
    return result.scalars().all()

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

    db_obj = Reservation(
        created_by_id=user_id,
        customer_name=obj_in.customer_name,
        med_org_id=obj_in.med_org_id,
        description=obj_in.description,
        validity_date=obj_in.validity_date,
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
        .options(selectinload(Reservation.items).selectinload(ReservationItem.product), selectinload(Reservation.created_by))
        .where(Reservation.id == id)
    )
    return result.scalars().first()

async def get_reservations(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Reservation]:
    result = await db.execute(
        select(Reservation)
        .options(selectinload(Reservation.items), selectinload(Reservation.created_by))
        .order_by(Reservation.date.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_reservation_status(db: AsyncSession, db_obj: Reservation, status: ReservationStatus) -> Reservation:
    db_obj.status = status
    
    # If confirmed, create Invoice automatically
    if status == ReservationStatus.CONFIRMED and not db_obj.invoice:
        invoice = Invoice(
            reservation_id=db_obj.id,
            total_amount=db_obj.total_amount,
            status=InvoiceStatus.UNPAID
        )
        db.add(invoice)
    
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Invoices
async def get_invoices(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Invoice]:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.reservation))
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
    query_assignments = select(DoctorFactAssignment)
    if med_rep_id:
        query_assignments = query_assignments.where(DoctorFactAssignment.med_rep_id == med_rep_id)
    
    res_assignments = await db.execute(query_assignments)
    assignments = res_assignments.scalars().all()
    
    # Each assignment is basically a fact transferred to a doctor. We can add them as separate facts
    for a in assignments:
        facts.append({
            "id": fact_id_counter,
            "med_rep_id": a.med_rep_id,
            "doctor_id": a.doctor_id,
            "product_id": a.product_id,
            "date": a.created_at.isoformat(),
            "amount": 0.0, # Will be calculated via expense
            "quantity": a.quantity
        })
        fact_id_counter += 1
        
    return facts

# DoctorFactAssignments
async def create_doctor_fact_assignment(db: AsyncSession, obj_in: DoctorFactAssignmentCreate) -> DoctorFactAssignment:
    db_obj = DoctorFactAssignment(
        med_rep_id=obj_in.med_rep_id,
        doctor_id=obj_in.doctor_id,
        product_id=obj_in.product_id,
        quantity=obj_in.quantity,
        month=obj_in.month,
        year=obj_in.year
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_doctor_fact_assignments(
    db: AsyncSession, skip: int = 0, limit: int = 100, med_rep_id: Optional[int] = None
) -> List[DoctorFactAssignment]:
    query = select(DoctorFactAssignment).offset(skip).limit(limit)
    if med_rep_id:
        query = query.where(DoctorFactAssignment.med_rep_id == med_rep_id)
    result = await db.execute(query)
    return result.scalars().all()

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
