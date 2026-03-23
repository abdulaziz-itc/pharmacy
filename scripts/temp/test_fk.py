import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("""
            SELECT
                tc.table_name, kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'bonus_ledger';
        """))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(run())
