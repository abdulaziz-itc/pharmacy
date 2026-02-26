from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

class HierarchyService:
    @staticmethod
    async def get_subordinates(db: AsyncSession, user_id: int):
        """
        Uses Recursive CTE to fetch the entire organization tree under a given user id.
        Ultra-fast O(1) query depth resolution.
        """
        query = """
        WITH RECURSIVE subordinates AS (
            SELECT id, full_name, role, is_active, manager_id
            FROM "user"
            WHERE id = :user_id
            
            UNION ALL
            
            SELECT u.id, u.full_name, u.role, u.is_active, u.manager_id
            FROM "user" u
            INNER JOIN subordinates s ON s.id = u.manager_id
        )
        SELECT * FROM subordinates;
        """
        result = await db.execute(query, {"user_id": user_id})
        return result.all()
