from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.models.crm import Doctor, MedicalOrganization, medrep_organization

class ReassignmentService:
    @staticmethod
    async def reassign_medrep(db: AsyncSession, from_rep_id: int, to_rep_id: int, current_user_id: int):
        """
        Transactionally shifts all doctors and organizations from one MedRep to another.
        Useful when an employee leaves or regions are restructured.
        """
        async with db.begin_nested() as transaction:
            try:
                # 1. Reassign Doctors (One-to-many relationship)
                await db.execute(
                    update(Doctor)
                    .where(Doctor.assigned_rep_id == from_rep_id)
                    .values(assigned_rep_id=to_rep_id)
                )

                # 2. Reassign Organizations (Many-to-many relationship)
                # Remove from old rep and link to new rep (while avoiding duplicates)
                # First, find orgs assigned to old rep
                old_assignments_query = select(medrep_organization.c.organization_id).where(
                    medrep_organization.c.user_id == from_rep_id
                )
                old_assignments_result = await db.execute(old_assignments_query)
                org_ids = [row[0] for row in old_assignments_result.all()]
                
                if org_ids:
                    # Remove from old rep
                    await db.execute(
                        medrep_organization.delete().where(
                            (medrep_organization.c.user_id == from_rep_id) & 
                            (medrep_organization.c.organization_id.in_(org_ids))
                        )
                    )
                    
                    # Check if new rep already has these orgs to avoid primary key collisions
                    new_assignments_query = select(medrep_organization.c.organization_id).where(
                        (medrep_organization.c.user_id == to_rep_id) &
                        (medrep_organization.c.organization_id.in_(org_ids))
                    )
                    new_assignments_result = await db.execute(new_assignments_query)
                    existing_org_ids = {row[0] for row in new_assignments_result.all()}
                    
                    # Insert for new rep
                    orgs_to_insert = [org for org in org_ids if org not in existing_org_ids]
                    if orgs_to_insert:
                        await db.execute(
                            medrep_organization.insert().values(
                                [{"user_id": to_rep_id, "organization_id": org} for org in orgs_to_insert]
                            )
                        )
                
                await db.commit()
                return {"message": f"Successfully reassigned {len(org_ids)} organizations and associated doctors from User {from_rep_id} to User {to_rep_id}."}
            except Exception as e:
                await transaction.rollback()
                raise HTTPException(status_code=500, detail=f"Reassignment failed: {str(e)}")
