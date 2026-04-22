import asyncio
from app.db.session import SessionLocal
from sqlalchemy import text

async def check_data():
    async with SessionLocal() as db:
        # Find organization
        res = await db.execute(text("SELECT id, name FROM med_organization WHERE name ILIKE '%Ажинияз%'"))
        orgs = res.all()
        print(f"Found organizations: {orgs}")
        
        if orgs:
            for org in orgs:
                org_id = org[0]
                # Check balance transactions
                res = await db.execute(text(f"SELECT id, transaction_type, amount, created_at, comment FROM balance_transaction WHERE med_organization_id = {org_id} AND ABS(amount) >= 220000000"))
                txs = res.all()
                print(f"Large Transactions for org {org_id} ({org[1]}): {txs}")
            
        # Check payments for anything large on April 22nd or April 17th
        res = await db.execute(text(f"SELECT id, invoice_id, amount, date, comment FROM payment WHERE amount >= 220000000"))
        payments = res.all()
        print(f"General Large payments: {payments}")

if __name__ == "__main__":
    asyncio.run(check_data())
