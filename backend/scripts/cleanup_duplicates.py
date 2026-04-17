
import asyncio
import logging
import sys
import os
from typing import List, Dict

# Add backend to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from app.models.crm import MedicalOrganization, Doctor, MedicalOrganizationStock, BalanceTransaction, medrep_organization
from app.models.sales import Reservation
from app.models.warehouse import Warehouse
from sqlalchemy import select, func, update, delete

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def cleanup_duplicates(dry_run: bool = True) -> None:
    """
    Finds and merges duplicate medical organizations.
    Duplicate defined as same Name and same INN.
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Find duplicate groups (Name, INN)
            dup_query = select(
                MedicalOrganization.name, 
                MedicalOrganization.inn, 
                func.count(MedicalOrganization.id)
            ).group_by(
                MedicalOrganization.name, 
                MedicalOrganization.inn
            ).having(func.count(MedicalOrganization.id) > 1)
            
            result = await db.execute(dup_query)
            duplicate_groups = result.all()
            
            if not duplicate_groups:
                logger.info("No duplicate organizations found.")
                return

            logger.info(f"Found {len(duplicate_groups)} groups of duplicate organizations.")

            for name, inn, count in duplicate_groups:
                logger.info(f"Processing group: '{name}' (INN: {inn}) - {count} entries")
                
                # Get all orgs in this group, ordered by ID (assuming oldest is master)
                orgs_query = select(MedicalOrganization).where(
                    (MedicalOrganization.name == name) & 
                    (MedicalOrganization.inn == inn)
                ).order_by(MedicalOrganization.id.asc())
                
                orgs_res = await db.execute(orgs_query)
                orgs = orgs_res.scalars().all()
                
                master = orgs[0]
                duplicates = orgs[1:]
                duplicate_ids = [d.id for d in duplicates]
                
                logger.info(f"  Master ID: {master.id}")
                logger.info(f"  Duplicate IDs to merge: {duplicate_ids}")
                
                if dry_run:
                    logger.info(f"  [DRY RUN] Would merge {len(duplicate_ids)} records into ID {master.id}")
                    continue

                # 2. Merge data into Master
                for dup_org in duplicates:
                    # Sum credit balance
                    master.credit_balance = (master.credit_balance or 0.0) + (dup_org.credit_balance or 0.0)
                
                # 3. Reassign related entities
                # Doctors
                await db.execute(
                    update(Doctor).where(Doctor.med_org_id.in_(duplicate_ids)).values(med_org_id=master.id)
                )
                
                # Reservations
                await db.execute(
                    update(Reservation).where(Reservation.med_org_id.in_(duplicate_ids)).values(med_org_id=master.id)
                )
                
                # Balance Transactions
                await db.execute(
                    update(BalanceTransaction).where(BalanceTransaction.organization_id.in_(duplicate_ids)).values(organization_id=master.id)
                )
                
                # Stocks (this is tricky because we might need to sum quantities if both have the same product)
                for dup_id in duplicate_ids:
                    stocks_query = select(MedicalOrganizationStock).where(MedicalOrganizationStock.med_org_id == dup_id)
                    stocks_res = await db.execute(stocks_query)
                    dup_stocks = stocks_res.scalars().all()
                    
                    for ds in dup_stocks:
                        # Check if master already has this product
                        m_stock_query = select(MedicalOrganizationStock).where(
                            (MedicalOrganizationStock.med_org_id == master.id) & 
                            (MedicalOrganizationStock.product_id == ds.product_id)
                        )
                        m_stock_res = await db.execute(m_stock_query)
                        m_stock = m_stock_res.scalar_one_or_none()
                        
                        if m_stock:
                            m_stock.quantity += ds.quantity
                            await db.delete(ds)
                        else:
                            ds.med_org_id = master.id
                
                # Warehouses (if any exist for duplicates, just reassign them)
                await db.execute(
                    update(Warehouse).where(Warehouse.med_org_id.in_(duplicate_ids)).values(med_org_id=master.id)
                )
                
                # medrep_organization (many-to-many associations)
                # Need to be careful not to create duplicate associations for the master
                for dup_id in duplicate_ids:
                    # Find reps for duplicate
                    reps_query = select(medrep_organization.c.user_id).where(medrep_organization.c.organization_id == dup_id)
                    reps_res = await db.execute(reps_query)
                    rep_ids = [r[0] for r in reps_res.all()]
                    
                    for r_id in rep_ids:
                        # Check if master already has this rep
                        exists_query = select(medrep_organization).where(
                            (medrep_organization.c.organization_id == master.id) & 
                            (medrep_organization.c.user_id == r_id)
                        )
                        exists_res = await db.execute(exists_query)
                        if not exists_res.all():
                            # Insert new association for master
                            await db.execute(
                                medrep_organization.insert().values(organization_id=master.id, user_id=r_id)
                            )
                    
                    # Delete associations for duplicate
                    await db.execute(
                        medrep_organization.delete().where(medrep_organization.c.organization_id == dup_id)
                    )

                # 4. Delete the duplicate organizations
                await db.execute(
                    delete(MedicalOrganization).where(MedicalOrganization.id.in_(duplicate_ids))
                )
                
                logger.info(f"  SUCCESS: Merged group '{name}' into ID {master.id}")

            if not dry_run:
                await db.commit()
                logger.info("Changes committed to database.")
            else:
                logger.info("Dry run complete. No changes were saved.")

        except Exception as e:
            await db.rollback()
            logger.error(f"Error during cleanup: {str(e)}")
            raise

if __name__ == "__main__":
    is_dry = "--execute" not in sys.argv
    
    print("-" * 50)
    print(f"Starting Medical Organization Cleanup (mode: {'DRY RUN' if is_dry else 'EXECUTE'})")
    if is_dry:
        print("Tip: Run with '--execute' to apply changes.")
    print("-" * 50)
    
    asyncio.run(cleanup_duplicates(dry_run=is_dry))
    print("-" * 50)
