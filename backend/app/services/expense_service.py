from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.models.finance import ExpenseCategory, OtherExpense
from app.schemas.finance import ExpenseCategoryCreate, OtherExpenseCreate
from typing import List

class ExpenseService:
    @staticmethod
    async def create_category(db: AsyncSession, obj_in: ExpenseCategoryCreate) -> ExpenseCategory:
        db_obj = ExpenseCategory(name=obj_in.name, description=obj_in.description)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_categories(db: AsyncSession) -> List[ExpenseCategory]:
        result = await db.execute(select(ExpenseCategory))
        return result.scalars().all()

    @staticmethod
    async def create_expense(db: AsyncSession, obj_in: OtherExpenseCreate, user_id: int) -> OtherExpense:
        from sqlalchemy.orm import selectinload
        db_obj = OtherExpense(
            category_id=obj_in.category_id,
            amount=obj_in.amount,
            comment=obj_in.comment,
            date=obj_in.date or datetime.utcnow(),
            created_by_id=user_id
        )
        db.add(db_obj)
        await db.commit()
        
        # Eagerly load relationships to prevent async serialization crashes
        res = await db.execute(
            select(OtherExpense)
            .options(selectinload(OtherExpense.category), selectinload(OtherExpense.created_by))
            .where(OtherExpense.id == db_obj.id)
        )
        return res.scalar_one()

    @staticmethod
    async def get_expenses(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 500,
        month: int = None,
        year: int = None,
        quarter: int = None
    ) -> List[OtherExpense]:
        from sqlalchemy.orm import selectinload
        from sqlalchemy import extract
        query = (
            select(OtherExpense)
            .options(selectinload(OtherExpense.category), selectinload(OtherExpense.created_by))
            .order_by(OtherExpense.date.desc())
        )
        if year:
            query = query.where(extract('year', OtherExpense.date) == year)
        if month:
            query = query.where(extract('month', OtherExpense.date) == month)
        elif quarter:
            # Quarter 1 = months 1-3, Q2 = 4-6, Q3 = 7-9, Q4 = 10-12
            start_month = (quarter - 1) * 3 + 1
            end_month = start_month + 2
            query = query.where(
                extract('month', OtherExpense.date) >= start_month,
                extract('month', OtherExpense.date) <= end_month
            )
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def get_total_expenses(db: AsyncSession, start_date=None, end_date=None, rep_ids: List[int] = None, region_id: int = None) -> float:
        query = select(func.sum(OtherExpense.amount))
        if start_date and end_date:
            query = query.where(OtherExpense.date.between(start_date, end_date))
        if rep_ids:
            query = query.where(OtherExpense.created_by_id.in_(rep_ids))
        # Note: If region_id is added to OtherExpense in the future, add filter here
        result = await db.execute(query)
        return result.scalar() or 0.0

    @staticmethod
    async def delete_expense(db: AsyncSession, expense_id: int) -> OtherExpense:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(OtherExpense)
            .options(selectinload(OtherExpense.category))
            .where(OtherExpense.id == expense_id)
        )
        db_obj = result.scalar_one_or_none()
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
        return db_obj
