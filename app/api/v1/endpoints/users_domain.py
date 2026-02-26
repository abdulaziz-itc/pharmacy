from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.models.user import User, UserRole
from app.services.reassignment_service import ReassignmentService
from app.services.hierarchy_service import HierarchyService
from pydantic import BaseModel

router = APIRouter()

class ReassignRequest(BaseModel):
    from_rep_id: int
    to_rep_id: int

@router.post("/users/reassign")
async def reassign_medrep_endpoint(
    *,
    db: AsyncSession = Depends(deps.get_db),
    req: ReassignRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Transactionally reassigns doctors and pharmacies from one MedRep to another.
    """
    if current_user.role not in [UserRole.DIRECTOR, UserRole.FIELD_FORCE_MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough permissions to reassign reps.")
        
    return await ReassignmentService.reassign_medrep(
        db=db, 
        from_rep_id=req.from_rep_id, 
        to_rep_id=req.to_rep_id,
        current_user_id=current_user.id
    )

@router.get("/users/{user_id}/hierarchy")
async def get_user_hierarchy(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieves the entire nested subordinate tree using Recursive CTEs.
    """
    # Assuming director can view anyone, or a user can view themselves
    if current_user.role != UserRole.DIRECTOR and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied.")
        
    subordinates = await HierarchyService.get_subordinates(db=db, user_id=user_id)
    return [
        {
            "id": row.id, 
            "full_name": row.full_name, 
            "role": row.role, 
            "is_active": row.is_active, 
            "manager_id": row.manager_id
        } for row in subordinates
    ]
