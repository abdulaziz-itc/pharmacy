import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.product import Product

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Product))
        for product in res.scalars().all():
             if "абела" in product.name.lower() or "abelazol" in product.name.lower() or "rabe" in product.name.lower() or "рабе" in product.name.lower():
                 print(f"Product: {product.name}")
                 print(f"Price: {product.price}")
                 print(f"Prod Price: {product.production_price}")
                 print(f"Salary Exp: {product.salary_expense}")
                 print(f"Marketing Exp: {product.marketing_expense}")
                 print(f"Other Exp: {product.other_expenses}")
                 print("---")

asyncio.run(main())
