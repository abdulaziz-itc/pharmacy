import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.ledger import BonusLedger
from app.models.sales import ReservationItem, Reservation
from sqlalchemy.orm import selectinload
from fastapi.encoders import jsonable_encoder
from app.services.finance_service import FinancialService

async def test_endpoint():
    async with AsyncSessionLocal() as db:
        target_id = 15 # The medrep ID
        try:
            balance = await FinancialService.get_medrep_bonus_balance(db, target_id)
            print("Balance calculated:", balance)
            
            query = select(BonusLedger).options(
                selectinload(BonusLedger.doctor),
                selectinload(BonusLedger.product),
                selectinload(BonusLedger.payment),
                selectinload(BonusLedger.invoice_item).selectinload(ReservationItem.reservation).selectinload(Reservation.invoice)
            ).where(BonusLedger.user_id == target_id)
            
            result = await db.execute(query)
            history = result.scalars().all()
            print("History fetched, count:", len(history))
            
            history_data = []
            for h in history:
                history_data.append({
                    "id": h.id,
                    "amount": h.amount,
                    "ledger_type": h.ledger_type,
                    "target_month": h.target_month,
                    "target_year": h.target_year,
                    "notes": h.notes,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                    "doctor": {
                        "id": h.doctor.id,
                        "full_name": h.doctor.full_name
                    } if h.doctor else None,
                    "product": {
                        "id": h.product.id,
                        "name": h.product.name
                    } if getattr(h, 'product', None) else None,
                    "payment_id": h.payment_id,
                    "invoice_id": h.invoice_item.reservation.invoice.id if getattr(h, 'invoice_item', None) and h.invoice_item.reservation and h.invoice_item.reservation.invoice else None
                })
            print("History mapped")
            
            response_data = {
                "balance": balance,
                "history": history_data
            }
            json_compatible_item_data = jsonable_encoder(response_data)
            print("JSON encoder succeeded")
            
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_endpoint())
