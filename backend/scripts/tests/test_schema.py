import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_sales import get_plans
from app.schemas.sales import Plan as PlanSchema
import traceback

async def main():
    try:
        async with AsyncSessionLocal() as db:
            plans = await get_plans(db, med_rep_id=14)
            for p in plans:
                try:
                    PlanSchema.model_validate(p)
                except Exception as e:
                    print(f"Error on plan id {p.id}: {e}")
            print("Done validation.")
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
