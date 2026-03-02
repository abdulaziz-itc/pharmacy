from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from contextlib import asynccontextmanager
import subprocess

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Running database migrations on startup...")
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True)
        print("Migrations applied successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins (must be before routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for Render deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to Pharma ERP+CRM API"}
