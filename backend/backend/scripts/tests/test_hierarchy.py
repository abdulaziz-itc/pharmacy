import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User

async def main():
    engine = create_async_engine(settings.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://") if "postgresql" not in settings.DATABASE_URL else settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == 2))
        user = result.scalars().first()
        print(f"User: {user}")
        if user:
            print(f"Manager ID attribute exists: {hasattr(user, 'manager_id')}")

if __name__ == "__main__":
    asyncio.run(main())
