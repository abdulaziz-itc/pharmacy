import sys
from sqlalchemy.orm import selectinload
from app.models.ledger import BonusLedger
from app.models.sales import Reservation, ReservationItem, Invoice

def test():
    try:
        print("Testing doctor...")
        selectinload(BonusLedger.doctor)
        print("Testing product...")
        selectinload(BonusLedger.product)
        print("Testing payment...")
        selectinload(BonusLedger.payment)
        print("Testing invoice_item...")
        selectinload(BonusLedger.invoice_item)
        print("Testing ReservationItem.reservation...")
        selectinload(ReservationItem.reservation)
        print("Testing Reservation.invoice...")
        selectinload(Reservation.invoice)
        
        print("Testing chain!")
        opt = selectinload(BonusLedger.invoice_item).selectinload(ReservationItem.reservation).selectinload(Reservation.invoice)
        print("Chain success:", opt)
    except Exception as e:
        print("Exception:", type(e), e)

test()
