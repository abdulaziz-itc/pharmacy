from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from pydantic.networks import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.config import settings
from app.crud import crud_user
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter()

@router.get("/", response_model=List[UserSchema])
async def read_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    username: Optional[str] = Query(None),
    full_name: Optional[str] = Query(None),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve users. Only for specific roles (e.g., DEPUTY_DIRECTOR).
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    users = await crud_user.get_multi(
        db, skip=skip, limit=limit, username=username, full_name=full_name
    )
    return users

@router.post("/", response_model=UserSchema)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new user.
    """
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    # If the creator is a Product Manager, enforce themselves as the manager if they are creating a subordinate
    if current_user.role == UserRole.PRODUCT_MANAGER:
        if user_in.role not in [UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.MED_REP]:
            raise HTTPException(status_code=400, detail="Product Manager can only create subordinates")
        user_in.manager_id = current_user.id
        
    user = await crud_user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a user.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.role not in [UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.PRODUCT_MANAGER]:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    if current_user.role == UserRole.PRODUCT_MANAGER:
        if user.role not in [UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER, UserRole.MED_REP]:
            raise HTTPException(status_code=400, detail="Product Manager can only edit subordinates")
            
    # Validation for deactivation (is_active = False)
    if user_in.is_active is False and user.is_active is True:
        # Check subordinates
        subordinates_query = await db.execute(select(User).where(User.manager_id == user_id, User.is_active == True))
        if subordinates_query.scalars().first():
            raise HTTPException(
                status_code=400, 
                detail=f"Невозможно деактивировать пользователя. У него все еще есть активные подчиненные."
            )
            
        # Check role-specific dependencies
        if user.role == UserRole.MED_REP:
            from app.models.crm import Doctor, medrep_organization
            from app.models.sales import Plan
            
            # Check for assigned doctors
            doctors_query = await db.execute(select(Doctor).where(Doctor.assigned_rep_id == user_id))
            if doctors_query.scalars().first():
                raise HTTPException(status_code=400, detail="Невозможно деактивировать медпредставителя. У него все еще есть прикрепленные врачи.")
                
            # Check for assigned organizations
            orgs_query = await db.execute(select(medrep_organization.c.organization_id).where(medrep_organization.c.user_id == user_id))
            if orgs_query.first():
                raise HTTPException(status_code=400, detail="Невозможно деактивировать медпредставителя. У него все еще есть прикрепленные аптеки/клиники.")
                
            # Check for plans (you might want to clarify if ALL plans or just active/incomplete plans block deactivation. For now, we block if ANY plans exist in current/future months, but a simpler approach is blocking if ANY exist that aren't closed. Let's block if any plans exist for the current year/month onwards to be safe)
            import datetime
            now = datetime.datetime.now()
            plans_query = await db.execute(
                select(Plan).where(
                    Plan.med_rep_id == user_id,
                    (Plan.year > now.year) | ((Plan.year == now.year) & (Plan.month >= now.month))
                )
            )
            if plans_query.scalars().first():
                raise HTTPException(status_code=400, detail="Невозможно деактивировать медпредставителя. У него все еще есть активные планы на текущий или будущие месяцы.")

    # Check if new username is already taken by someone else
    if user_in.username and user_in.username != user.username:
        user_exists = await crud_user.get_by_username(db, username=user_in.username)
        if user_exists:
            raise HTTPException(
                status_code=400,
                detail="The user with this username already exists in the system.",
            )
            
    user = await crud_user.update(db, db_obj=user, obj_in=user_in)
    return user

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.get("/med-reps")
async def get_med_reps(
    role: Optional[str] = Query(None, description="Filter by role"),
    username: Optional[str] = Query(None),
    full_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get users (optionally filtered by role) with their manager name resolved.
    Used for the medical representatives page with role filter tabs.
    """
    # Get all users to build manager lookup
    all_users_result = await db.execute(select(User))
    all_users = all_users_result.scalars().all()
    
    # Build manager name lookup
    manager_lookup = {u.id: u.full_name for u in all_users}
    
    # Filter by role if specified, otherwise return med_reps by default
    if role:
        filtered = [u for u in all_users if u.role == role]
    else:
        filtered = [u for u in all_users if u.role == UserRole.MED_REP]
    
    if username:
        filtered = [u for u in filtered if username.lower() in u.username.lower()]
    if full_name:
        filtered = [u for u in filtered if full_name.lower() in u.full_name.lower()]
    
    # Build response with manager name
    result = []
    for user in filtered:
        result.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "manager_name": manager_lookup.get(user.manager_id, None) if user.manager_id else None,
        })
    
    return result

from pydantic import BaseModel
class ReassignRequest(BaseModel):
    from_user_id: int
    to_user_id: int

@router.post("/reassign")
async def reassign_user_dependencies(
    req: ReassignRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Transfer all subordinates, territories (doctors, organizations), and active plans 
    from one user to another user of the same role.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.DIRECTOR, UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough permissions to reassign.")
        
    from_user = await crud_user.get(db, id=req.from_user_id)
    to_user = await crud_user.get(db, id=req.to_user_id)
    
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if from_user.role != to_user.role:
        raise HTTPException(status_code=400, detail="Cannot transfer dependencies between different roles.")
        
    if from_user.role in [UserRole.PRODUCT_MANAGER, UserRole.FIELD_FORCE_MANAGER, UserRole.REGIONAL_MANAGER]:
        if current_user.role not in [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR]:
            raise HTTPException(status_code=403, detail="Only Admin, Director, or Deputy Director can reassign manager authority.")
            
    # Reassign subordinates
    subordinates = await db.execute(select(User).where(User.manager_id == req.from_user_id))
    for sub in subordinates.scalars().all():
        sub.manager_id = req.to_user_id
        
    if from_user.role == UserRole.MED_REP:
        from app.models.crm import Doctor, medrep_organization
        from app.models.sales import Plan, DoctorFactAssignment, BonusPayment
        import datetime
        from sqlalchemy import update, delete
        
        # 1. Reassign Doctors
        await db.execute(
            update(Doctor)
            .where(Doctor.assigned_rep_id == req.from_user_id)
            .values(assigned_rep_id=req.to_user_id)
        )
        
        # 2. Reassign Organizations (Many to Many)
        # Fetch orgs assigned to the 'from' user
        orgs_query = await db.execute(
            select(medrep_organization.c.organization_id)
            .where(medrep_organization.c.user_id == req.from_user_id)
        )
        org_ids = [row[0] for row in orgs_query.all()]
        
        if org_ids:
            # Check if 'to' user already has any of these orgs to prevent PK violations
            existing_orgs_query = await db.execute(
                select(medrep_organization.c.organization_id)
                .where(medrep_organization.c.user_id == req.to_user_id, medrep_organization.c.organization_id.in_(org_ids))
            )
            existing_org_ids = [row[0] for row in existing_orgs_query.all()]
            
            org_ids_to_add = [oid for oid in org_ids if oid not in existing_org_ids]
            
            # Delete from old
            await db.execute(
                delete(medrep_organization)
                .where(medrep_organization.c.user_id == req.from_user_id)
            )
            
            # Insert to new
            if org_ids_to_add:
                values = [{"user_id": req.to_user_id, "organization_id": oid} for oid in org_ids_to_add]
                await db.execute(medrep_organization.insert().values(values))
                
        # 3. Reassign ALL Plans (Historical and Future)
        await db.execute(
            update(Plan)
            .where(Plan.med_rep_id == req.from_user_id)
            .values(med_rep_id=req.to_user_id)
        )
        
        # 4. Reassign Doctor Facts
        await db.execute(
            update(DoctorFactAssignment)
            .where(DoctorFactAssignment.med_rep_id == req.from_user_id)
            .values(med_rep_id=req.to_user_id)
        )

        # 5. Reassign Bonus Payments (incl. Pre-investments)
        await db.execute(
            update(BonusPayment)
            .where(BonusPayment.med_rep_id == req.from_user_id)
            .values(med_rep_id=req.to_user_id)
        )
        
    await db.commit()
    return {"msg": "Successfully transferred all dependencies."}
