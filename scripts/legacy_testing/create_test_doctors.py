import asyncio
import logging
from app.db.session import AsyncSessionLocal
from app.models.crm import Doctor, MedicalOrganization, MedicalOrganizationType, Region, DoctorSpecialty, DoctorCategory
from app.models.user import User, UserRole
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_test_doctors() -> None:
    async with AsyncSessionLocal() as db:
        # Check/Create Region
        result = await db.execute(select(Region).where(Region.name == "Tashkent"))
        region = result.scalars().first()
        if not region:
            region = Region(name="Tashkent")
            db.add(region)
            await db.commit()
            await db.refresh(region)
            print(f"Created Region: {region.name}")

        # Check/Create Specialty
        result = await db.execute(select(DoctorSpecialty).where(DoctorSpecialty.name == "Cardiologist"))
        specialty = result.scalars().first()
        if not specialty:
            specialty = DoctorSpecialty(name="Cardiologist")
            db.add(specialty)
            await db.commit()
            await db.refresh(specialty)
            print(f"Created Specialty: {specialty.name}")
            
        # Check/Create Category
        result = await db.execute(select(DoctorCategory).where(DoctorCategory.name == "Higher"))
        category = result.scalars().first()
        if not category:
            category = DoctorCategory(name="Higher")
            db.add(category)
            await db.commit()
            await db.refresh(category)
            print(f"Created Category: {category.name}")

        # Check/Create Medical Organization
        result = await db.execute(select(MedicalOrganization).where(MedicalOrganization.name == "Test Clinic"))
        med_org = result.scalars().first()
        if not med_org:
            med_org = MedicalOrganization(
                name="Test Clinic",
                address="123 Test St",
                region_id=region.id,
                org_type=MedicalOrganizationType.CLINIC
            )
            db.add(med_org)
            await db.commit()
            await db.refresh(med_org)
            print(f"Created Med Org: {med_org.name}")

        # Check/Create Doctor
        result = await db.execute(select(Doctor).where(Doctor.full_name == "Dr. Testov"))
        doctor = result.scalars().first()
        if not doctor:
            doctor = Doctor(
                full_name="Dr. Testov",
                region_id=region.id,
                specialty_id=specialty.id,
                category_id=category.id,
                med_org_id=med_org.id
            )
            db.add(doctor)
            await db.commit()
            await db.refresh(doctor)
            print(f"Created Doctor: {doctor.full_name} with ID: {doctor.id}")
        else:
             print(f"Doctor exists: {doctor.full_name} with ID: {doctor.id}")

if __name__ == "__main__":
    asyncio.run(create_test_doctors())
