import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.product import Product

async def check_product():
    async with AsyncSessionLocal() as db:
        query = select(Product).where(Product.name.ilike("%Неолайтон%"))
        result = await db.execute(query)
        products = result.scalars().all()
        for p in products:
            print(f"ID: {p.id}, Name: {p.name}, Price: {p.price}, Salary Expense: {p.salary_expense}, Marketing Expense: {p.marketing_expense}")

if __name__ == "__main__":
    asyncio.run(check_product())
