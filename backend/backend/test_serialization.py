
import asyncio
import os
import sys
import datetime

sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))

from app.db.session import AsyncSessionLocal
from app.models.visit import VisitPlan
from app.models.crm import Doctor, MedicalOrganization, Region, MedicalOrganizationType, DoctorSpecialty
from app.models.user import User
from app.schemas.visit_plan import VisitPlan as VisitPlanSchema
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import ValidationError

async def test_visit_plans():
    async with AsyncSessionLocal() as db:
        try:
            # Reusing existing test objects from db if available
            region = (await db.execute(select(Region).where(Region.name=="Test Region"))).scalars().first()
            if not region:
                region = Region(name="Test Region")
                db.add(region)
                await db.commit()
            
            spec = (await db.execute(select(DoctorSpecialty).where(DoctorSpecialty.name=="Test Specialty"))).scalars().first()
            if not spec:
                spec = DoctorSpecialty(name="Test Specialty")
                db.add(spec)
                await db.commit()
            
            med_org = (await db.execute(select(MedicalOrganization).where(MedicalOrganization.name=="Test Clinic").options(selectinload(MedicalOrganization.assigned_reps)))).scalars().first()
            if not med_org:
                med_org = MedicalOrganization(name="Test Clinic", region_id=region.id, org_type=MedicalOrganizationType.CLINIC)
                db.add(med_org)
                await db.commit()
                med_org = (await db.execute(select(MedicalOrganization).where(MedicalOrganization.name=="Test Clinic").options(selectinload(MedicalOrganization.assigned_reps)))).scalars().first()
            
            user = (await db.execute(select(User).where(User.username=="test_med_rep").options(selectinload(User.assigned_regions)))).scalars().first()
            if not user:
                user = User(username="test_med_rep", hashed_password="pwd", full_name="Test Med Rep")
                db.add(user)
                await db.commit()
                # Reload to get collections initialized
                user = (await db.execute(select(User).where(User.username=="test_med_rep").options(selectinload(User.assigned_regions)))).scalars().first()

            # Assign user to region
            if region not in user.assigned_regions:
                user.assigned_regions.append(region)
                await db.commit()
            
            # Assign user to med_org
            if user not in med_org.assigned_reps:
                med_org.assigned_reps.append(user)
                await db.commit()
            
            doc = (await db.execute(select(Doctor).where(Doctor.full_name=="Dr Test"))).scalars().first()
            if not doc:
                doc = Doctor(full_name="Dr Test", region_id=region.id, specialty_id=spec.id, med_org_id=med_org.id, assigned_rep_id=user.id)
                db.add(doc)
                await db.commit()
            elif doc.assigned_rep_id is None:
                doc.assigned_rep_id = user.id
                await db.commit()
            
            plan = (await db.execute(select(VisitPlan).where(VisitPlan.doctor_id==doc.id))).scalars().first()
            if not plan:
                plan = VisitPlan(med_rep_id=user.id, doctor_id=doc.id, med_org_id=med_org.id, planned_date=datetime.datetime.utcnow())
                db.add(plan)
                await db.commit()

            print("Created test data successfully")

            query = select(VisitPlan).options(
                selectinload(VisitPlan.doctor).selectinload(Doctor.med_org).selectinload(MedicalOrganization.assigned_reps).selectinload(User.assigned_regions),
                selectinload(VisitPlan.doctor).selectinload(Doctor.med_org).selectinload(MedicalOrganization.region),
                selectinload(VisitPlan.doctor).selectinload(Doctor.specialty),
                selectinload(VisitPlan.doctor).selectinload(Doctor.category),
                selectinload(VisitPlan.doctor).selectinload(Doctor.region),
                selectinload(VisitPlan.doctor).selectinload(Doctor.assigned_rep).selectinload(User.assigned_regions),
                selectinload(VisitPlan.med_org).selectinload(MedicalOrganization.assigned_reps).selectinload(User.assigned_regions),
                selectinload(VisitPlan.med_org).selectinload(MedicalOrganization.region)
            )
            result = await db.execute(query)
            plans = result.scalars().all()
            print(f"DEBUG: Found {len(plans)} plans")
            
            print("Step 1: Queries complete")

            print("Step 2: Attempting model_validate")
            if hasattr(VisitPlanSchema, "model_validate"):
                validated_plans = [VisitPlanSchema.model_validate(p, from_attributes=True) for p in plans]
            else:
                validated_plans = [VisitPlanSchema.from_orm(p) for p in plans]
                
            print("Step 3: Serialization SUCCESS")
        except ValidationError as e:
            print("Validation FAILED:", e.errors())
        except Exception as e:
            print(f"\nFAILED AT UNKNOWN STEP!")
            print(f"Error class: {type(e).__name__}")
            print(f"Error msg: {e}")
            import traceback
            tb = traceback.extract_tb(e.__traceback__)
            print(f"\nTop frame: {tb[-1]}")
            print(f"Second to last frame: {tb[-2]}")
            print(f"Third to last frame: {tb[-3]}")

if __name__ == "__main__":
    asyncio.run(test_visit_plans())
