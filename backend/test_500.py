import asyncio
import sys
# add to path
sys.path.append('.')
from app.db.session import AsyncSessionLocal
from app.crud.crud_sales import get_doctor_fact_assignments
from app.schemas.sales import DoctorFactAssignment
from pydantic import TypeAdapter

async def main():
    async with AsyncSessionLocal() as db:
        try:
            items = await get_doctor_fact_assignments(db, doctor_id=8)
            print(f"Found {len(items)} items")
            for item in items:
                try:
                    DoctorFactAssignment.model_validate(item, from_attributes=True)
                except Exception as e:
                    print(f"Serialization failed for item {item.id}: {e}")
            print("Done")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
