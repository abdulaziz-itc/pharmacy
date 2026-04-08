import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.sales import (
    Reservation, ReservationItem, Invoice, Payment, UnassignedSale, DoctorFactAssignment, ReservationStatus
)
from app.models.crm import Doctor, MedicalOrganization
from app.models.user import User
from app.models.product import Product
from app.schemas.sales import ReservationCreate, ReservationItemCreate, PaymentCreate
from app.crud.crud_sales import create_reservation, create_payment
from app.services.finance_service import FinancialService

async def test_fact_amount():
    async with AsyncSessionLocal() as db:
        # Find a Med Rep, Doctor, and Product
        med_rep = (await db.execute(select(User).limit(1))).scalars().first()
        doctor = (await db.execute(select(Doctor).limit(1))).scalars().first()
        product = (await db.execute(select(Product).limit(1))).scalars().first()
        med_org = (await db.execute(select(MedicalOrganization).limit(1))).scalars().first()

        from app.models.warehouse import Warehouse
        warehouse = (await db.execute(select(Warehouse).limit(1))).scalars().first()

        if not all([med_rep, doctor, product, med_org, warehouse]):
            print("Missing required dummy data")
            return

        print(f"Product price: {product.price}")
        
        # 1. Create a reservation with 50% discount
        res_in = ReservationCreate(
            customer_name="Test Direct Fix",
            med_org_id=med_org.id,
            warehouse_id=warehouse.id,
            description="Test fact calculation",
            nds_percent=0,
            items=[
                ReservationItemCreate(
                    product_id=product.id,
                    quantity=10,
                    price=product.price,
                    discount_percent=50
                )
            ]
        )
        
        # Note: crude reservation creation that doesn't trigger all background tasks. 
        # But we will use the crud method.
        reservation = await create_reservation(db, obj_in=res_in, user_id=med_rep.id)
        print(f"Created reservation with total price: {reservation.total_amount}")
        
        # Manually create invoice and approve reservation
        reservation.status = ReservationStatus.APPROVED
        invoice = Invoice(
            reservation_id=reservation.id,
            factura_number=f"TEST-FACT-{reservation.id}",
            total_amount=reservation.total_amount,
            paid_amount=0
        )
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)
        
        # 2. Pay invoice (this should generate unassigned sale via event listeners... wait, does it? 
        # Actually `create_payment` doesn't trigger `trigger_sales_recognition` directly unless called through service.
        # Let's use the service method)
        payment_in = PaymentCreate(
            invoice_id=invoice.id,
            payment_type="cash",
            amount=invoice.total_amount,
            comment="Test full payment"
        )
        await FinancialService.process_payment(db, payment_in, processor_id=med_rep.id)
        
        # 3. Find or Create UnassignedSale
        unassigned_query = select(UnassignedSale).where(UnassignedSale.invoice_id == invoice.id)
        unassigned = (await db.execute(unassigned_query)).scalars().first()
        
        if not unassigned:
            print("Manually creating UnassignedSale for test purposes...")
            unassigned = UnassignedSale(
                invoice_id=invoice.id,
                med_rep_id=med_rep.id,
                product_id=product.id,
                total_quantity=10,
                paid_quantity=10,
                assigned_quantity=0
            )
            db.add(unassigned)
            await db.commit()
            await db.refresh(unassigned)
            
        print(f"Created UnassignedSale ID: {unassigned.id}, Available Qty: {unassigned.paid_quantity}")
        
        # 4. Assign UnassignedSale to doctor
        fact = await FinancialService.assign_unassigned_sale(
            db=db,
            med_rep_id=med_rep.id,
            unassigned_id=unassigned.id,
            doctor_id=doctor.id,
            quantity=1
        )
        
        # 5. Verify the amount
        expected_price = product.price * 0.5  # 50% discount
        print(f"Assigned 1 unit. Expected Amount: {expected_price}. Actual Fact Amount: {fact.amount}")
        
        if fact.amount == expected_price:
            print("SUCCESS: Fact amount matches discounted invoice price!")
        else:
            print("FAILURE: Fact amount does not match.")
            
        print("Done.")

if __name__ == "__main__":
    asyncio.run(test_fact_amount())
