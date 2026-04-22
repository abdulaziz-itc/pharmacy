from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.crm import Region, Doctor, MedicalOrganization, DoctorSpecialty, DoctorCategory
from app.schemas.crm import (
    RegionCreate, DoctorCreate, DoctorUpdate, 
    MedicalOrganizationCreate, MedicalOrganizationUpdate,
    DoctorSpecialtyCreate, DoctorCategoryCreate
)
from sqlalchemy import func
from app.models.sales import Invoice, Reservation, InvoiceStatus

# Region
async def get_regions(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Region]:
    result = await db.execute(select(Region).offset(skip).limit(limit))
    return result.scalars().all()

async def create_region(db: AsyncSession, obj_in: RegionCreate) -> Region:
    db_obj = Region(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_region(db: AsyncSession, id: int) -> Optional[Region]:
    result = await db.execute(select(Region).where(Region.id == id))
    return result.scalars().first()

async def update_region(db: AsyncSession, db_obj: Region, obj_in: RegionCreate) -> Region:
    update_data = obj_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Doctor Specialty
async def get_specialties(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[DoctorSpecialty]:
    result = await db.execute(select(DoctorSpecialty).offset(skip).limit(limit))
    return result.scalars().all()

async def create_specialty(db: AsyncSession, obj_in: DoctorSpecialtyCreate) -> DoctorSpecialty:
    db_obj = DoctorSpecialty(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Doctor Category
async def get_doctor_categories(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[DoctorCategory]:
    result = await db.execute(select(DoctorCategory).offset(skip).limit(limit))
    categories = result.scalars().all()
    if not categories:
        # Auto-seed default categories if empty
        for name in ["VIP", "A", "B", "C"]:
            db.add(DoctorCategory(name=name))
        await db.commit()
        result = await db.execute(select(DoctorCategory).offset(skip).limit(limit))
        categories = result.scalars().all()
    return categories

async def create_doctor_category(db: AsyncSession, obj_in: DoctorCategoryCreate) -> DoctorCategory:
    db_obj = DoctorCategory(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

from sqlalchemy import func, case

async def get_med_orgs(
    db: AsyncSession, 
    *,
    skip: int = 0, 
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    rep_ids: Optional[List[int]] = None,
) -> List[MedicalOrganization]:
    # Subquery for current debt and surplus
    debt_sub = select(
        Reservation.med_org_id,
        func.sum(
            case(
                (Invoice.total_amount > Invoice.paid_amount, Invoice.total_amount - Invoice.paid_amount),
                else_=0.0
            )
        ).label("total_debt"),
        func.sum(
            case(
                (Invoice.paid_amount > Invoice.total_amount, Invoice.paid_amount - Invoice.total_amount),
                else_=0.0
            )
        ).label("total_surplus")
    ).join(Invoice, Reservation.id == Invoice.reservation_id)\
     .where(Invoice.status != InvoiceStatus.CANCELLED)\
     .group_by(Reservation.med_org_id).subquery()

    query = select(
        MedicalOrganization,
        func.coalesce(debt_sub.c.total_debt, 0.0).label("current_debt"),
        func.coalesce(debt_sub.c.total_surplus, 0.0).label("current_surplus")
    ).outerjoin(debt_sub, MedicalOrganization.id == debt_sub.c.med_org_id)\
     .options(
        selectinload(MedicalOrganization.region),
        selectinload(MedicalOrganization.assigned_reps)
    ).distinct()
    
    if name:
        query = query.where(MedicalOrganization.name.ilike(f"%{name}%"))
    if region_id:
        query = query.where(MedicalOrganization.region_id == region_id)
    if rep_id:
        from app.models.user import User
        query = query.where(MedicalOrganization.assigned_reps.any(User.id == rep_id))
    if rep_ids:
        from app.models.user import User
        query = query.where(MedicalOrganization.assigned_reps.any(User.id.in_(rep_ids)))
        
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    
    final_orgs = []
    for org, debt, surplus in rows:
        # These are transient attributes, NOT persisted to DB
        org.current_debt = float(debt)
        org.current_surplus = float(surplus) + (org.credit_balance or 0.0)
        final_orgs.append(org)
    return final_orgs

async def create_med_org(db: AsyncSession, obj_in: MedicalOrganizationCreate) -> MedicalOrganization:
    obj_data = obj_in.dict()
    assigned_rep_ids = obj_data.pop("assigned_rep_ids", [])
    
    # Check for duplicates by INN
    inn = obj_data.get("inn")
    if inn:
        existing_q = select(MedicalOrganization).where(MedicalOrganization.inn == inn)
        existing_res = await db.execute(existing_q)
        if existing_res.scalars().first():
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400, 
                detail=f"Организация с ИНН '{inn}' уже существует в системе."
            )

    db_obj = MedicalOrganization(**obj_data)
    
    if assigned_rep_ids:
        from app.models.user import User
        reps = await db.execute(select(User).where(User.id.in_(assigned_rep_ids)))
        db_obj.assigned_reps = reps.scalars().all()
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    query = select(MedicalOrganization).options(selectinload(MedicalOrganization.region), selectinload(MedicalOrganization.assigned_reps)).where(MedicalOrganization.id == db_obj.id)
    result = await db.execute(query)
    return result.scalars().first()

from sqlalchemy import func, case, and_

async def get_med_org(db: AsyncSession, id: int) -> Optional[MedicalOrganization]:
    query = select(MedicalOrganization).options(
        selectinload(MedicalOrganization.region),
        selectinload(MedicalOrganization.assigned_reps)
    ).where(MedicalOrganization.id == id)
    result = await db.execute(query)
    org = result.scalars().first()
    if org:
        # Calculate debt for single org
        from app.models.sales import Invoice, Reservation, InvoiceStatus
        debt_q = select(
            func.sum(
                case(
                    (Invoice.total_amount > Invoice.paid_amount, Invoice.total_amount - Invoice.paid_amount),
                    else_=0.0
                )
            ).label("debt"),
            func.sum(
                case(
                    (Invoice.paid_amount > Invoice.total_amount, Invoice.paid_amount - Invoice.total_amount),
                    else_=0.0
                )
            ).label("surplus")
        ).join(Reservation, Reservation.id == Invoice.reservation_id)\
         .where(and_(Reservation.med_org_id == id, Invoice.status != InvoiceStatus.CANCELLED))
        
        debt_res = await db.execute(debt_q)
        debt_row = debt_res.first()
        debt_val = float(debt_row.debt or 0.0) if debt_row else 0.0
        surplus_val = float(debt_row.surplus or 0.0) if debt_row else 0.0
        
        org.current_debt = debt_val
        org.current_surplus = surplus_val + (org.credit_balance or 0.0)
    return org

async def update_med_org(db: AsyncSession, db_obj: MedicalOrganization, obj_in: MedicalOrganizationUpdate) -> MedicalOrganization:
    update_data = obj_in.dict(exclude_unset=True)
    assigned_rep_ids = update_data.pop("assigned_rep_ids", None)
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    # Check for duplicates by INN if it's being changed
    inn = update_data.get("inn")
    if inn and inn != db_obj.inn:
        existing_q = select(MedicalOrganization).where(
            (MedicalOrganization.inn == inn) &
            (MedicalOrganization.id != db_obj.id)
        )
        existing_res = await db.execute(existing_q)
        if existing_res.scalars().first():
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400, 
                detail=f"Невозможно обновить: организация с ИНН '{inn}' уже существует."
            )
        
    if assigned_rep_ids is not None:
        from app.models.user import User
        reps = await db.execute(select(User).where(User.id.in_(assigned_rep_ids)))
        db_obj.assigned_reps = reps.scalars().all()
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_med_org(db, db_obj.id)

# Doctor
async def get_doctor(db: AsyncSession, id: int) -> Optional[Doctor]:
    result = await db.execute(
        select(Doctor)
        .options(
            selectinload(Doctor.region),
            selectinload(Doctor.specialty),
            selectinload(Doctor.category),
            selectinload(Doctor.med_org).selectinload(MedicalOrganization.region),
            selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps),
            selectinload(Doctor.assigned_rep)
        )
        .where(Doctor.id == id)
    )
    return result.scalars().first()

async def get_doctors(
    db: AsyncSession, 
    *,
    skip: int = 0, 
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    specialty_id: Optional[int] = None,
    med_org_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    rep_ids: Optional[List[int]] = None,
) -> List[Doctor]:
    query = select(Doctor).options(
        selectinload(Doctor.region),
        selectinload(Doctor.specialty),
        selectinload(Doctor.category),
        selectinload(Doctor.med_org).selectinload(MedicalOrganization.region),
        selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps),
        selectinload(Doctor.assigned_rep)
    )
    
    if name:
        query = query.where(Doctor.full_name.ilike(f"%{name}%"))
    if region_id:
        query = query.where(Doctor.region_id == region_id)
    if specialty_id:
        query = query.where(Doctor.specialty_id == specialty_id)
    if med_org_id:
        query = query.where(Doctor.med_org_id == med_org_id)
    if rep_id:
        query = query.where(Doctor.assigned_rep_id == rep_id)
    if rep_ids:
        query = query.where(Doctor.assigned_rep_id.in_(rep_ids))
        

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_doctor(db: AsyncSession, obj_in: DoctorCreate) -> Doctor:
    obj_data = obj_in.dict()
    category_name = obj_data.pop("category_name", None)
    
    if category_name and not obj_data.get("category_id"):
        result = await db.execute(select(DoctorCategory).where(DoctorCategory.name == category_name))
        category = result.scalars().first()
        if not category:
            category = DoctorCategory(name=category_name)
            db.add(category)
            await db.commit()
            await db.refresh(category)
        obj_data["category_id"] = category.id

    db_obj = Doctor(**obj_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_doctor(db, db_obj.id)

async def update_doctor(db: AsyncSession, db_obj: Doctor, obj_in: DoctorUpdate) -> Doctor:
    update_data = obj_in.dict(exclude_unset=True)
    category_name = update_data.pop("category_name", None)
    
    if category_name and not update_data.get("category_id"):
        result = await db.execute(select(DoctorCategory).where(DoctorCategory.name == category_name))
        category = result.scalars().first()
        if not category:
            category = DoctorCategory(name=category_name)
            db.add(category)
            await db.commit()
            await db.refresh(category)
        update_data["category_id"] = category.id
        
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_doctor(db, db_obj.id)
