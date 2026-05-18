import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def debug_hierarchy():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User)
            .where(User.role == UserRole.MED_REP, User.is_active == True)
            .limit(20)
        )
        medreps = res.scalars().all()
        
        print("--- MANAGER HIERARCHY DEBUG ---")
        for mr in medreps:
            print(f"\nMedRep: {mr.full_name} (ID: {mr.id})")
            if mr.manager_id:
                mgr_res = await db.execute(select(User).where(User.id == mr.manager_id))
                mgr = mgr_res.scalar_one_or_none()
                if mgr:
                    print(f"  -> Manager: {mgr.full_name} (Role: {mgr.role}, ID: {mgr.id})")
                    if mgr.manager_id:
                        mgr2_res = await db.execute(select(User).where(User.id == mgr.manager_id))
                        mgr2 = mgr2_res.scalar_one_or_none()
                        if mgr2:
                            print(f"    -> GrandManager: {mgr2.full_name} (Role: {mgr2.role}, ID: {mgr2.id})")
                        else:
                             print("    -> GrandManager: NOT FOUND")
                    else:
                        print("    -> GrandManager: NONE")
                else:
                    print("  -> Manager: NOT FOUND")
            else:
                print("  -> Manager: NONE")

        # Also let's list what roles actually exist in the system for managers
        res2 = await db.execute(select(User.role).distinct())
        print("\n--- ALL ROLES IN DB ---")
        for r in res2.scalars().all():
            print(f"- {r}")

if __name__ == "__main__":
    asyncio.run(debug_hierarchy())
