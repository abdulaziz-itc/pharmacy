import asyncio
import sys
import os
sys.path.append('.')

from app.db.session import engine, AsyncSessionLocal
# Import app.db.base to ensure all models are registered with Base.metadata
import app.db.base  # noqa
from app.db.base_class import Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

async def reset_db():
    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("All tables dropped.")

    print("Creating all tables via SQLAlchemy...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created.")

    print("Stamping alembic head...")
    os.system("alembic stamp head")

    print("\nSeeding admin and director users...")
    async with AsyncSessionLocal() as db:
        roles = [UserRole.ADMIN, UserRole.DIRECTOR]
        for role in roles:
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
            print(f"  Role: {role.value.ljust(15)} | Login: {username.ljust(15)} | Password: {password}")

        await db.commit()
    print("\nDatabase reset and seeded successfully!")

if __name__ == "__main__":
    asyncio.run(reset_db())
