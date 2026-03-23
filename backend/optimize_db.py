import asyncio
from app.db.session import engine
from sqlalchemy import text

async def optimize():
    print("Connecting to database for optimization...")
    async with engine.begin() as conn:
        print("Adding indexes to speed up reports and sales...")
        
        # Optimization indexes for analytics and plan matching
        queries = [
            "CREATE INDEX IF NOT EXISTS idx_plan_lookup ON plan (month, year, med_rep_id, doctor_id, product_id)",
            "CREATE INDEX IF NOT EXISTS idx_fact_lookup ON doctor_fact_assignment (month, year, med_rep_id, doctor_id, product_id)",
            "CREATE INDEX IF NOT EXISTS idx_res_date_status ON reservation (date, status)",
            "CREATE INDEX IF NOT EXISTS idx_invoice_res_id ON invoice (reservation_id)",
            "CREATE INDEX IF NOT EXISTS idx_res_item_res_id ON reservationitem (reservation_id)"
        ]
        
        for q in queries:
            try:
                await conn.execute(text(q))
                print(f"Executed: {q[:40]}...")
            except Exception as e:
                print(f"Error executing {q[:40]}: {e}")
        
        print("\n✅ Database optimization complete! The app should run much faster now.")

if __name__ == "__main__":
    asyncio.run(optimize())
