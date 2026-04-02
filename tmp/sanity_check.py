import os
import sys
import traceback

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

print("DEBUG: Starting Sanity Check (Import Test)...")

try:
    print("DEBUG: 1. Trying to import SQLAlchemy models...")
    from app.models.visit import VisitPlan
    from app.models.crm import MedicalOrganization, Doctor
    print("SUCCESS: Models imported.")

    print("DEBUG: 2. Trying to import API routers...")
    from app.api.v1.endpoints import visit_plans, reports
    print("SUCCESS: Routers imported.")

    print("DEBUG: 3. Trying to import FastAPI main app...")
    from app.main import app
    print("SUCCESS: App imported.")

    print("--- SANITY CHECK PASSED ---")
except Exception:
    print("!!! SANITY CHECK FAILED !!!")
    traceback.print_exc()
    sys.exit(1)
