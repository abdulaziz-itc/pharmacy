from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models.visit import VisitPlan
from app.schemas.visit_plan import VisitPlan as VisitPlanSchema, VisitPlanCreate, VisitPlanUpdate
from app.models.user import User

router = APIRouter()


async def _get_plan_with_relations(db: AsyncSession, plan_id: int) -> VisitPlan:
    """Re-fetch a visit plan with all relationships eagerly loaded."""
    result = await db.execute(
        select(VisitPlan)
        .options(
            selectinload(VisitPlan.doctor),
            selectinload(VisitPlan.med_org)
        )
        .where(VisitPlan.id == plan_id)
    )
    return result.scalar_one_or_none()


@router.get("/", response_model=List[VisitPlanSchema])
async def get_visit_plans(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    med_rep_id: Optional[int] = None,
) -> Any:
    """Retrieve visit plans."""
    query = select(VisitPlan).options(
        selectinload(VisitPlan.doctor),
        selectinload(VisitPlan.med_org)
    )
    if med_rep_id:
        query = query.where(VisitPlan.med_rep_id == med_rep_id)
    elif current_user.role == "med_rep":
        query = query.where(VisitPlan.med_rep_id == current_user.id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=VisitPlanSchema)
async def create_visit_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    visit_plan_in: VisitPlanCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new visit plan."""
    try:
        data = visit_plan_in.dict()
        is_completed = data.pop("is_completed", None)
        
        if is_completed is True:
            data["status"] = "completed"
        elif is_completed is False:
            data["status"] = "planned"
        
        db_obj = VisitPlan(
            **data,
            med_rep_id=current_user.id
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return await _get_plan_with_relations(db, db_obj.id)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{plan_id}", response_model=VisitPlanSchema)
async def update_visit_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    plan_id: int,
    visit_plan_in: VisitPlanUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a visit plan."""
    result = await db.execute(select(VisitPlan).where(VisitPlan.id == plan_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Visit plan not found")

    update_data = visit_plan_in.dict(exclude_unset=True)
    is_completed = update_data.pop("is_completed", None)
    
    if is_completed is True:
        update_data["status"] = "completed"
    elif is_completed is False:
        update_data["status"] = "planned"

    for field in update_data:
        setattr(db_obj, field, update_data[field])

    db.add(db_obj)
    await db.commit()
    # Re-fetch with relationships to avoid async lazy-load error
    return await _get_plan_with_relations(db, plan_id)


@router.delete("/{plan_id}")
async def delete_visit_plan(
    *,
    db: AsyncSession = Depends(deps.get_db),
    plan_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete a visit plan."""
    result = await db.execute(select(VisitPlan).where(VisitPlan.id == plan_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Visit plan not found")

    await db.delete(db_obj)
    await db.commit()
    return {"ok": True, "id": plan_id}
