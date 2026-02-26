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
    return result.scalars().all()

async def create_doctor_category(db: AsyncSession, obj_in: DoctorCategoryCreate) -> DoctorCategory:
    db_obj = DoctorCategory(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# Medical Organization
async def get_med_orgs(
    db: AsyncSession, 
    *,
    skip: int = 0, 
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    rep_id: Optional[int] = None,
) -> List[MedicalOrganization]:
    query = select(MedicalOrganization).options(
        selectinload(MedicalOrganization.region),
        selectinload(MedicalOrganization.assigned_reps)
    )
    
    if name:
        query = query.where(MedicalOrganization.name.ilike(f"%{name}%"))
    if region_id:
        query = query.where(MedicalOrganization.region_id == region_id)
    if rep_id:
        query = query.where(MedicalOrganization.assigned_reps.any(User.id == rep_id))
        
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_med_org(db: AsyncSession, obj_in: MedicalOrganizationCreate) -> MedicalOrganization:
    obj_data = obj_in.dict()
    assigned_rep_ids = obj_data.pop("assigned_rep_ids", [])
    
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

async def get_med_org(db: AsyncSession, id: int) -> Optional[MedicalOrganization]:
    query = select(MedicalOrganization).options(
        selectinload(MedicalOrganization.region),
        selectinload(MedicalOrganization.assigned_reps)
    ).where(MedicalOrganization.id == id)
    result = await db.execute(query)
    return result.scalars().first()

async def update_med_org(db: AsyncSession, db_obj: MedicalOrganization, obj_in: MedicalOrganizationUpdate) -> MedicalOrganization:
    update_data = obj_in.dict(exclude_unset=True)
    assigned_rep_ids = update_data.pop("assigned_rep_ids", None)
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
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
        query = query.where(Doctor.name.ilike(f"%{name}%"))
    if region_id:
        query = query.where(Doctor.region_id == region_id)
    if specialty_id:
        query = query.where(Doctor.specialty_id == specialty_id)
    if med_org_id:
        query = query.where(Doctor.med_org_id == med_org_id)
    if rep_id:
        query = query.where(Doctor.assigned_rep_id == rep_id)
        
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_doctor(db: AsyncSession, obj_in: DoctorCreate) -> Doctor:
    db_obj = Doctor(**obj_in.dict())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_doctor(db, db_obj.id)

async def update_doctor(db: AsyncSession, db_obj: Doctor, obj_in: DoctorUpdate) -> Doctor:
    update_data = obj_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return await get_doctor(db, db_obj.id)
