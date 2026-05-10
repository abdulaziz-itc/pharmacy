import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.sales import Invoice, Reservation, ReservationItem
from app.models.product import Product

async def check():
    async with AsyncSessionLocal() as db:
        query = select(Invoice, Reservation, ReservationItem, Product).join(
            Reservation, Invoice.reservation_id == Reservation.id
        ).join(
            ReservationItem, Reservation.id == ReservationItem.reservation_id
        ).join(
            Product, ReservationItem.product_id == Product.id
        ).where(
            Invoice.status != "cancelled",
            Invoice.total_amount > 0
        )
        
        result = await db.execute(query)
        rows = result.all()
        
        all_invoices = []
        for invoice, reservation, item, product in rows:
            sell_price = item.price * (1 - (item.discount_percent or 0) / 100.0)
            cost_price = product.production_price or 0
            
            bonus = item.marketing_amount if item.marketing_amount > 0 else (product.marketing_expense or 0)
            salary = item.salary_amount if item.salary_amount > 0 else (product.salary_expense or 0)
            
            if not reservation.is_bonus_eligible:
                bonus = 0
            if not reservation.is_salary_enabled:
                salary = 0
                
            other = product.other_expenses or 0
            
            total_cost = cost_price + bonus + salary + other
            profit = sell_price - total_cost
            
            margin = (profit / sell_price * 100) if sell_price > 0 else 0
            
            all_invoices.append({
                "invoice_id": invoice.id,
                "factura_number": invoice.factura_number or str(invoice.id),
                "product": product.name,
                "qty": item.quantity,
                "sell_price": sell_price,
                "cost_price": cost_price,
                "bonus": bonus,
                "salary": salary,
                "total_cost": total_cost,
                "profit": profit,
                "margin": margin,
                "bonus_on": reservation.is_bonus_eligible,
                "salary_on": reservation.is_salary_enabled
            })
        
        # 20 ta eng marjasi past (yoki minus) bo'lgan fakturalarni chiqaramiz
        worst = sorted(all_invoices, key=lambda x: x['margin'])[:20]
        
        print("\n=== MARJASI ENG PAST (FOYDASI KAM YOKI MINUS) FAKTURALAR ===")
        print(f"{'Faktura/Bron #':<15} | {'Dori':<20} | {'Sotuv narxi':<15} | {'Tan narxi':<15} | {'Bonus':<10} | {'Oylik':<10} | {'Jami Rasxod':<15} | {'Sof foyda':<15} | {'Marja %':<10}")
        print("-" * 140)
        
        for b in worst:
            print(f"{b['factura_number']:<15} | {b['product'][:18]:<20} | {b['sell_price']:<15,.0f} | {b['cost_price']:<15,.0f} | {b['bonus']:<10,.0f} | {b['salary']:<10,.0f} | {b['total_cost']:<15,.0f} | {b['profit']:<15,.0f} | {b['margin']:<10.1f}")

if __name__ == "__main__":
    import logging
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    asyncio.run(check())
