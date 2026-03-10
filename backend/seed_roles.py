import asyncio
import sys
# add to path
sys.path.append('.')
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from passlib.context import CryptContext

async def seed_users():
    async with AsyncSessionLocal() as db:
        roles = [
            UserRole.ADMIN,
            UserRole.DIRECTOR,
            UserRole.DEPUTY_DIRECTOR,
            UserRole.HEAD_OF_ORDERS,
            UserRole.WHOLESALE_MANAGER,
            UserRole.PRODUCT_MANAGER,
            UserRole.FIELD_FORCE_MANAGER,
            UserRole.REGIONAL_MANAGER,
            UserRole.MED_REP
        ]
        
        print("--- USER CREDENTIALS ---")
        for index, role in enumerate(roles, start=1):
            username = role.value
            password = f"{username}123"
            
            db_user = User(
                full_name=f"Test {role.name.replace('_', ' ').title()}",
                username=username,
                hashed_password=get_password_hash(password),
                is_active=True,
                role=role.value
            )
            db.add(db_user)
            print(f"Role: {role.value.ljust(25)} | Login: {username.ljust(25)} | Password: {password}")
            
        await db.commit()
        print("------------------------")
        print("Database seeded with one user for each role successfully.")

if __name__ == "__main__":
    asyncio.run(seed_users())
