from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import crud_crm
from app.models.user import User, UserRole
from app.schemas.crm import (
    Region, RegionCreate, RegionUpdate,
    Doctor, DoctorCreate, DoctorUpdate,
    MedicalOrganization as MedicalOrganizationSchema, MedicalOrganizationCreate, MedicalOrganizationUpdate,
    DoctorSpecialty, DoctorSpecialtyCreate,
    DoctorCategory, DoctorCategoryCreate,
    BalanceTransaction, OrganizationBalanceTopUp
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.crm import Doctor, MedicalOrganization, BalanceTransaction as BalanceTransactionModel, BalanceTransactionType, Region
from app.models.warehouse import Warehouse, Stock
from app.models.product import Product
from app.crud import crud_sales
from app.schemas.sales import Plan
from datetime import datetime
from app.services.audit_service import log_action

router = APIRouter()

@router.get("/med-orgs/{org_id}", response_model=MedicalOrganizationSchema)
@router.get("/med-orgs/{org_id}/", response_model=MedicalOrganizationSchema, include_in_schema=False)
async def read_med_org(
    *,
    db: AsyncSession = Depends(deps.get_db),
    org_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    med_org = await crud_crm.get_med_org(db, id=org_id)
    if not med_org:
        raise HTTPException(status_code=404, detail="Medical Organization not found")
    return med_org

@router.put("/med-orgs/{org_id}", response_model=MedicalOrganizationSchema)
@router.put("/med-orgs/{org_id}/", response_model=MedicalOrganizationSchema, include_in_schema=False)
async def update_med_org(
    *,
    db: AsyncSession = Depends(deps.get_db),
    org_id: int,
    med_org_in: MedicalOrganizationUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    med_org = await crud_crm.get_med_org(db, id=org_id)
    if not med_org:
        raise HTTPException(status_code=404, detail="Medical Organization not found")
        
    updated_med_org = await crud_crm.update_med_org(db, db_obj=med_org, obj_in=med_org_in)
    await log_action(
        db, current_user, "UPDATE", "MedicalOrganization", updated_med_org.id,
        f"Обновлена организация: {updated_med_org.name}",
        request
    )
    return updated_med_org


# Regions
@router.get("/regions/", response_model=List[Region])
async def read_regions(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role == UserRole.REGIONAL_MANAGER:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(User).options(selectinload(User.assigned_regions)).where(User.id == current_user.id))
        user_db = result.scalars().first()
        return user_db.assigned_regions if user_db else []
    return await crud_crm.get_regions(db, skip=skip, limit=limit)

@router.post("/regions/", response_model=Region)
async def create_region(
    *,
    db: AsyncSession = Depends(deps.get_db),
    region_in: RegionCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    region = await crud_crm.create_region(db, obj_in=region_in)
    await log_action(
        db, current_user, "CREATE", "Region", region.id,
        f"Добавлен новый регион: {region.name}",
        request
    )
    return region

@router.put("/regions/{id}", response_model=Region)
async def update_region(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    region_in: RegionUpdate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    region = await crud_crm.get_region(db, id=id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
        
    updated_region = await crud_crm.update_region(db, db_obj=region, obj_in=region_in)
    await log_action(
        db, current_user, "UPDATE", "Region", updated_region.id,
        f"Регион изменен: {updated_region.name}",
        request
    )
    return updated_region

# Doctor Specialties
@router.get("/doctor-specialties/", response_model=List[DoctorSpecialty])
async def read_specialties(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_specialties(db, skip=skip, limit=limit)

@router.post("/doctor-specialties/", response_model=DoctorSpecialty)
async def create_specialty(
    *,
    db: AsyncSession = Depends(deps.get_db),
    specialty_in: DoctorSpecialtyCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    specialty = await crud_crm.create_specialty(db, obj_in=specialty_in)
    await log_action(
        db, current_user, "CREATE", "Specialty", specialty.id,
        f"Добавлена специальность врача: {specialty.name}",
        request
    )
    return specialty

# Doctor Categories
@router.get("/doctor-categories/", response_model=List[DoctorCategory])
async def read_doctor_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await crud_crm.get_doctor_categories(db, skip=skip, limit=limit)

@router.post("/doctor-categories/", response_model=DoctorCategory)
async def create_doctor_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: DoctorCategoryCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    category = await crud_crm.create_doctor_category(db, obj_in=category_in)
    await log_action(
        db, current_user, "CREATE", "DoctorCategory", category.id,
        f"Добавлена категория врача: {category.name}",
        request
    )
    return category

# Medical Organizations
@router.get("/med-orgs", response_model=List[MedicalOrganization])
async def read_med_orgs(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        from app.crud.crud_user import get_descendant_ids
        rep_ids = None
        if current_user.role in [UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.PRODUCT_MANAGER]:
            rep_ids = await get_descendant_ids(db, current_user.id)
            if not rep_ids:
                rep_ids = [-1]
        elif current_user.role in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR]:
            rep_ids = None # Full access
        elif current_user.role == UserRole.MED_REP:
            rep_ids = [current_user.id]

        return await crud_crm.get_med_orgs(
            db, 
            skip=skip, 
            limit=limit, 
            name=name, 
            region_id=region_id, 
            rep_id=rep_id,
            rep_ids=rep_ids
        )
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=str(error_msg))

@router.post("/med-orgs", response_model=MedicalOrganizationSchema)
async def create_med_org(
    *,
    db: AsyncSession = Depends(deps.get_db),
    med_org_in: MedicalOrganizationCreate,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    # Allow MED_REP and Managers to create organizations
    allowed = {
        UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, 
        UserRole.FIELD_FORCE_MANAGER, UserRole.PRODUCT_MANAGER, UserRole.REGIONAL_MANAGER,
        UserRole.HEAD_OF_ORDERS, UserRole.ADMIN, UserRole.MED_REP
    }
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Auto-assign MedRep if they are the creator
    if current_user.role == UserRole.MED_REP:
        if not med_org_in.assigned_rep_ids:
            med_org_in.assigned_rep_ids = [current_user.id]
        elif current_user.id not in med_org_in.assigned_rep_ids:
            med_org_in.assigned_rep_ids.append(current_user.id)

    med_org = await crud_crm.create_med_org(db, obj_in=med_org_in)
    
    # Automatically create a warehouse for Pharmacy or Wholesale
    from app.models.crm import MedicalOrganizationType
    if med_org.org_type in [MedicalOrganizationType.PHARMACY, MedicalOrganizationType.WHOLESALE]:
        from app.models.warehouse import Warehouse, WarehouseType
        # Check if warehouse already exists (unlikely for new org)
        warehouse_check = await db.execute(select(Warehouse).where(Warehouse.med_org_id == med_org.id))
        if not warehouse_check.scalars().first():
            new_warehouse = Warehouse(
                name=f"Sklad: {med_org.name}",
                warehouse_type=WarehouseType.PHARMACY if med_org.org_type == MedicalOrganizationType.PHARMACY else WarehouseType.CENTRAL,
                med_org_id=med_org.id
            )
            db.add(new_warehouse)
            await db.commit()

    await log_action(
        db, current_user, "CREATE", "MedicalOrganization", med_org.id,
        f"Добавленa организация: {med_org.name}",
        request
    )
    return med_org

@router.get("/med-orgs/{org_id}/balance-history", response_model=List[BalanceTransaction])
async def get_med_org_balance_history(
    *,
    db: AsyncSession = Depends(deps.get_db),
    org_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get credit balance transaction history for a medical organization.
    """
    from app.models.crm import BalanceTransaction as BalanceTransactionModel
    from app.models.sales import Invoice
    result = await db.execute(
        select(
            BalanceTransactionModel,
            Invoice.factura_number
        )
        .outerjoin(Invoice, BalanceTransactionModel.related_invoice_id == Invoice.id)
        .where(BalanceTransactionModel.organization_id == org_id)
        .order_by(BalanceTransactionModel.created_at.desc())
    )
    
    transactions = []
    for row in result.all():
        tx = row[0]
        tx.factura_number = row[1]
        transactions.append(tx)
    
    return transactions


@router.post("/med-orgs/{org_id}/top-up-balance", response_model=MedicalOrganizationSchema)
async def top_up_med_org_balance(
    *,
    db: AsyncSession = Depends(deps.get_db),
    org_id: int,
    top_up_in: OrganizationBalanceTopUp,
    current_user: User = Depends(deps.get_current_user),
    request: Request,
) -> Any:
    """
    Manually top up organization balance (Accountant logic).
    Settles debts first if any.
    """
    # 1. Check if organization exists first (prevents 500 error if missing)
    org_check = await db.execute(select(MedicalOrganization).where(MedicalOrganization.id == org_id))
    if not org_check.scalars().first():
        raise HTTPException(status_code=404, detail=f"Medical Organization with ID {org_id} not found")

    # 2. Only allow certain roles
    allowed_roles = {
        UserRole.ADMIN, 
        UserRole.DIRECTOR, 
        UserRole.DEPUTY_DIRECTOR, 
        UserRole.HEAD_OF_ORDERS,
        UserRole.ACCOUNTANT,
        UserRole.INVESTOR
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not enough permissions to top up balance")
    
    await crud_sales.top_up_organization_balance(
        db, 
        organization_id=org_id, 
        amount=top_up_in.amount, 
        comment=f"{top_up_in.comment or ''}".strip(),
        user_id=current_user.id
    )
    
    # Re-fetch full object with all relationships (region, assigned_reps) eagerly loaded
    # This prevents the 500 error during serialization in async mode.
    updated_org = await crud_crm.get_med_org(db, org_id)
    if not updated_org:
        raise HTTPException(status_code=404, detail="Medical Organization not found after top-up")
        
    await log_action(
        db, current_user, "TOPUP", "MedicalOrganization", org_id,
        f"Баланс организации {updated_org.name} пополнен на {top_up_in.amount}. Коммент: {top_up_in.comment}",
        request
    )
    
    return updated_org

@router.get("/med-orgs/{id}/stock")
async def get_med_org_stock(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get warehouse stock for a specific medical organization (e.g. Pharmacy)
    """
    # Find the warehouse assigned to this med org
    warehouse_result = await db.execute(select(Warehouse).where(Warehouse.med_org_id == id))
    warehouse = warehouse_result.scalars().first()
    
    if not warehouse:
        # If no warehouse is assigned, they have no stock
        return []
        
    # Get stock with product names
    stock_query = select(Stock).options(selectinload(Stock.product)).where(Stock.warehouse_id == warehouse.id)
    stock_result = await db.execute(stock_query)
    stocks = stock_result.scalars().all()
    
    result = []
    for s in stocks:
        result.append({
            "product_id": s.product_id,
            "product_name": s.product.name if s.product else "Unknown",
            "quantity": s.quantity
        })
        
    return result

# Doctors
@router.get("/doctors", response_model=List[Doctor])
async def read_doctors(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    region_id: Optional[int] = None,
    specialty_id: Optional[int] = None,
    med_org_id: Optional[int] = None,
    rep_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    from app.crud.crud_user import get_descendant_ids
    
    rep_ids = None
    role_name = current_user.role
    if role_name == UserRole.MED_REP.value or role_name == UserRole.MED_REP:
        rep_ids = [current_user.id]
    elif role_name in [UserRole.FIELD_FORCE_MANAGER.value, UserRole.REGIONAL_MANAGER.value, UserRole.PRODUCT_MANAGER.value]:
        rep_ids = await get_descendant_ids(db, current_user.id)
        if not rep_ids:
            rep_ids = [-1]
    
    return await crud_crm.get_doctors(
        db, 
        skip=skip, 
        limit=limit, 
        name=name, 
        region_id=region_id, 
        specialty_id=specialty_id, 
        med_org_id=med_org_id,
        rep_id=rep_id,
        rep_ids=rep_ids
    )
    
@router.get("/doctors/{id}", response_model=Doctor)
async def read_doctor(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get doctor by ID.
    """
    doctor = await crud_crm.get_doctor(db, id=id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.get("/doctors/{id}/plans", response_model=List[Plan])
async def read_doctor_plans(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get doctor plans (with fact_quantity populated) for a specific month.
    """
    if not month:
        month = datetime.utcnow().month
    if not year:
        year = datetime.utcnow().year
        
    return await crud_sales.get_plans(db, doctor_id=id, month=month, year=year)

@router.post("/doctors", response_model=Doctor)
async def create_doctor(
    *,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    doctor_in: DoctorCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    # Allow MED_REP to create doctors
    allowed = {UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER, UserRole.HEAD_OF_ORDERS, UserRole.ADMIN, UserRole.MED_REP}
    if current_user.role not in allowed:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    # Auto-assign MedRep if they are the creator
    if current_user.role == UserRole.MED_REP:
        doctor_in.assigned_rep_id = current_user.id

    doctor = await crud_crm.create_doctor(db, obj_in=doctor_in)
    await log_action(db, current_user, "CREATE", "Doctor", doctor.id,
                     f"Добавлен новый врач: {doctor.full_name}", request)
    return doctor

@router.put("/doctors/{id}", response_model=Doctor)
async def update_doctor(
    *,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    doctor_in: DoctorUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    doctor = await crud_crm.get_doctor(db, id=id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    if doctor_in.is_active is False and doctor.is_active is True:
        from app.models.sales import Plan, BonusPayment, DoctorFactAssignment
        from app.models.product import Product
        import datetime
        from sqlalchemy import select, func
        now = datetime.datetime.now()

        # 1. Block if active future plans exist
        plans_query = await db.execute(
            select(Plan).where(
                Plan.doctor_id == id,
                (Plan.year > now.year) | ((Plan.year == now.year) & (Plan.month >= now.month))
            )
        )
        if plans_query.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Невозможно деактивировать врача. У него все еще есть активные планы на текущий или будущие месяцы."
            )

        # 2. Block if outstanding preinvestment balance exists
        # Total paid bonus for this doctor
        bp_result = await db.execute(
            select(func.coalesce(func.sum(BonusPayment.amount), 0))
            .where(BonusPayment.doctor_id == id)
        )
        total_paid = bp_result.scalar() or 0.0

        if total_paid > 0:
            # Earned bonus = sum of (fact.quantity × product.marketing_expense)
            facts_result = await db.execute(
                select(DoctorFactAssignment, Product)
                .join(Product, DoctorFactAssignment.product_id == Product.id)
                .where(DoctorFactAssignment.doctor_id == id)
            )
            earned = sum(
                (fact.quantity or 0) * (product.marketing_expense or 0)
                for fact, product in facts_result.all()
            )

            if total_paid > earned:
                preinvest = total_paid - earned
                raise HTTPException(
                    status_code=400,
                    detail=f"Bu vrach {preinvest:,.0f} UZS preinvest qarzdorligiga ega. Avval qarzni yoping, so'ng deaktivatsiya qiling."
                )

    updated_doctor = await crud_crm.update_doctor(db, db_obj=doctor, obj_in=doctor_in)
    
    status_change_msg = ""
    if doctor_in.is_active is not None and doctor.is_active != doctor_in.is_active:
        status_change_msg = f" (Статус: {'Активен' if doctor_in.is_active else 'Неактивен'})"
        
    await log_action(db, current_user, "UPDATE", "Doctor", updated_doctor.id,
                     f"Данные врача изменены: {updated_doctor.full_name}{status_change_msg}", request)
    return updated_doctor


@router.delete("/doctors/{id}")
async def delete_doctor(
    *,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Permanently delete a doctor only if they have no history
    (no BonusPayment, DoctorFactAssignment, or Plan records).
    """
    if current_user.role not in [UserRole.INVESTOR, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    from app.models.sales import Plan, DoctorFactAssignment, BonusPayment
    from app.models.crm import Doctor as DoctorModel

    doctor = await crud_crm.get_doctor(db, id=id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Guard: check for any bonus payments
    bp = await db.execute(select(BonusPayment).where(BonusPayment.doctor_id == id).limit(1))
    if bp.scalars().first():
        raise HTTPException(status_code=400, detail="Bu vrach uchun bonus to'lovlar tarixi mavjud. O'chirib bo'lmaydi.")

    # Guard: check for any doctor fact assignments
    fa = await db.execute(select(DoctorFactAssignment).where(DoctorFactAssignment.doctor_id == id).limit(1))
    if fa.scalars().first():
        raise HTTPException(status_code=400, detail="Bu vrach uchun fakt tarixi mavjud. O'chirib bo'lmaydi.")

    # Guard: check for any plans
    pl = await db.execute(select(Plan).where(Plan.doctor_id == id).limit(1))
    if pl.scalars().first():
        raise HTTPException(status_code=400, detail="Bu vrach uchun plan tarixi mavjud. O'chirib bo'lmaydi.")

    # Safe to delete
    doc_name = doctor.full_name
    await db.delete(doctor)
    
    await log_action(db, current_user, "DELETE", "Doctor", id,
                     f"Врач удален из базы: {doc_name}", request)
                     
    await db.commit()
    return {"ok": True}
