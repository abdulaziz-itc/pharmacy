
import sys
import os
import asyncio
sys.path.append(os.path.abspath("/Users/macbook13/Documents/pharma_new/backend"))
from app.db.session import AsyncSessionLocal
from app.models.crm import Doctor, MedicalOrganization, Region, MedicalOrganizationType, DoctorSpecialty
from app.models.user import User
from app.schemas.user import User as UserSchema
from sqlalchemy import select
from pydantic import ValidationError

async def test():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username=="test_med_rep3"))
        u = result.scalars().first()
        try:
            ud = UserSchema.model_validate(u, from_attributes=True)
            print("SUCCESS")
        except ValidationError as e:
            print("Validation FAILED:", e.errors())
        except Exception as e:
            print("Other Error:", e)
            import traceback
            traceback.print_exc()

asyncio.run(test())
