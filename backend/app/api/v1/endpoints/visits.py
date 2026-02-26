from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.user import User
from app.models.visit import Visit, VisitPlan
from app.models.crm import Doctor, MedicalOrganization
from app.schemas.visit import Visit as VisitSchema, VisitCreate, VisitPlan as VisitPlanSchema, VisitPlanCreate

router = APIRouter()

@router.get("/{user_id}/visits")
async def get_user_visits(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all visits for a specific medical representative.
    Returns visits with doctor and medical organization details.
    """
    # Get all visits for the user
    result = await db.execute(
        select(Visit)
        .where(Visit.med_rep_id == user_id)
        .order_by(Visit.visit_date.desc())
    )
    visits = result.scalars().all()
    
    # Enrich with doctor and med org data
    enriched_visits = []
    for visit in visits:
        doctor_result = await db.execute(
            select(Doctor).where(Doctor.id == visit.doctor_id)
        )
        doctor = doctor_result.scalars().first()
        
        med_org = None
        if doctor and doctor.med_org_id:
            med_org_result = await db.execute(
                select(MedicalOrganization).where(MedicalOrganization.id == doctor.med_org_id)
            )
            med_org = med_org_result.scalars().first()
        
        enriched_visits.append({
            "id": visit.id,
            "visit_date": visit.visit_date,
            "visit_type": visit.visit_type,
            "result": visit.result,
            "notes": visit.notes,
            "doctor": {
                "id": doctor.id if doctor else None,
                "full_name": doctor.full_name if doctor else "Unknown",
            },
            "med_org": {
                "id": med_org.id if med_org else None,
                "name": med_org.name if med_org else "Unknown",
            } if med_org else None,
        })
    
    return enriched_visits

@router.post("/visits/")
async def create_visit(
    visit_in: VisitCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new visit.
    """
    visit = Visit(**visit_in.model_dump())
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return VisitSchema.model_validate(visit)

@router.get("/{user_id}/plans", response_model=List[VisitPlanSchema])
async def get_user_plans(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all visit plans for a specific medical representative.
    """
    result = await db.execute(
        select(VisitPlan)
        .where(VisitPlan.med_rep_id == user_id)
        .order_by(VisitPlan.planned_date.desc())
    )
    plans = result.scalars().all()
    return plans

@router.post("/plans/", response_model=VisitPlanSchema)
async def create_visit_plan(
    plan_in: VisitPlanCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new visit plan.
    """
    plan = VisitPlan(**plan_in.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan
