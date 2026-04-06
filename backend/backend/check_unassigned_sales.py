import asyncio
from app.db.session import async_session_maker
from sqlalchemy import select, func, or_
from app.models.sales import Invoice, Reservation, ReservationItem, InvoiceStatus
from app.models.user import User, UserRole
from app.models.crm import MedicalOrganization

async def run():
    async with async_session_maker() as db:
        # 1. Global Total Realization
        global_q = select(func.sum(ReservationItem.quantity * ReservationItem.price)).select_from(Invoice)\
            .join(Reservation, Invoice.reservation_id == Reservation.id)\
            .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        global_total = (await db.execute(global_q)).scalar() or 0
        print(f"Global Total Realization: {global_total}")

        # 2. Sum of MedRep Realizations (current logic)
        medreps_result = await db.execute(select(User).where(User.role == UserRole.MED_REP, User.is_active == True))
        medreps = medreps_result.scalars().all()
        
        assigned_total = 0
        for rep in medreps:
            real_q = select(func.sum(ReservationItem.quantity * ReservationItem.price)).select_from(Invoice)\
                .join(Reservation, Invoice.reservation_id == Reservation.id)\
                .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
                .outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)\
                .where(Invoice.status != InvoiceStatus.CANCELLED)\
                .where(or_(
                    Reservation.created_by_id == rep.id, 
                    MedicalOrganization.assigned_reps.any(User.id == rep.id)
                ))
            rep_real = (await db.execute(real_q)).scalar() or 0
            assigned_total += rep_real
            # Note: This might double count if organization has multiple reps!
        
        print(f"Sum of Per-MedRep Realizations: {assigned_total}")

        # 3. Find completely unassigned invoices
        # An invoice is unassigned if:
        # - reservation.created_by.role != MED_REP
        # AND
        # - reservation.med_org has no assigned MED_REPs
        
        unassigned_q = select(Invoice.id, ReservationItem.quantity * ReservationItem.price).select_from(Invoice)\
            .join(Reservation, Invoice.reservation_id == Reservation.id)\
            .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
            .outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)\
            .where(Invoice.status != InvoiceStatus.CANCELLED)
            
        # This is tricky in SQL directly without checking all reps.
        # Let's just find invoices where no rep matches.
        
        all_invoices = await db.execute(select(Invoice.id, Reservation.created_by_id, Reservation.med_org_id).join(Reservation))
        
        processed_invoices = set()
        unassigned_total = 0
        
        # Let's just do a simpler query: 
        # Invoices where (Reservation.created_by_id is NOT in med_rep_ids) 
        # AND (MedicalOrganization.assigned_reps is empty or none of them are med_reps)
        
        rep_ids = [r.id for r in medreps]
        
        # Invoices not by medreps
        q = select(Invoice.id, func.sum(ReservationItem.quantity * ReservationItem.price))\
            .join(Reservation, Invoice.reservation_id == Reservation.id)\
            .join(ReservationItem, Reservation.id == ReservationItem.reservation_id)\
            .outerjoin(MedicalOrganization, Reservation.med_org_id == MedicalOrganization.id)\
            .where(Invoice.status != InvoiceStatus.CANCELLED)\
            .where(Reservation.created_by_id.notin_(rep_ids))\
            .group_by(Invoice.id, Reservation.med_org_id)
            
        # We also need to check if those organizations have any medreps
        res = await db.execute(q)
        for row in res:
            inv_id = row[0]
            amount = row[1]
            # Check if org has reps
            org_id = (await db.execute(select(Reservation.med_org_id).where(Reservation.invoice_id == inv_id))).scalar()
            has_reps = False
            if org_id:
                reps_count = (await db.execute(select(func.count(User.id)).select_from(MedicalOrganization).join(MedicalOrganization.assigned_reps).where(MedicalOrganization.id == org_id, User.role == UserRole.MED_REP))).scalar()
                if reps_count > 0:
                    has_reps = True
            
            if not has_reps:
                unassigned_total += amount
                
        print(f"Completely Unassigned Realization: {unassigned_total}")

asyncio.run(run())
