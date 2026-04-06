import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

def test_imports():
    print("Testing dashboard import...")
    try:
        from app.api.v1.endpoints.dashboard import router as dashboard_router
        print("Dashboard import SUCCESS")
    except Exception as e:
        print(f"Dashboard import FAILED: {e}")
        import traceback
        traceback.print_exc()

    print("\nTesting reports import...")
    try:
        from app.api.v1.endpoints.reports import router as reports_router
        print("Reports import SUCCESS")
    except Exception as e:
        print(f"Reports import FAILED: {e}")
        import traceback
        traceback.print_exc()

    print("\nTesting visit_plans import...")
    try:
         from app.api.v1.endpoints.visit_plans import router as vp_router
         print("Visit Plans import SUCCESS")
    except Exception as e:
         print(f"Visit Plans import FAILED: {e}")

    print("\nTesting finance_service import...")
    try:
        from app.services.finance_service import FinancialService
        print("FinancialService import SUCCESS")
    except Exception as e:
        print(f"FinancialService import FAILED: {e}")

if __name__ == "__main__":
    test_imports()
