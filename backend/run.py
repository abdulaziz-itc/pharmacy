import uvicorn
import subprocess
import os
from app.initial_data import main as init_data

def run_migrations():
    print("Running database migrations...")
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True)
        print("Migrations complete.")
    except Exception as e:
        print(f"Migration error: {e}")

def main():
    # 1. Run migrations
    run_migrations()
    
    # 2. Seed initial data
    print("Seeding initial data...")
    init_data()
    
    # 3. Start server
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

if __name__ == "__main__":
    main()
