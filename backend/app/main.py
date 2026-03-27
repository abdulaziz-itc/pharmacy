from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
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
    
    print("Initializing database data...")
    try:
        from app.initial_data import init_db
        await init_db()
        print("Database initialization successful!")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = traceback.format_exc()
    with open("error_log.txt", "a") as f:
        f.write(f"\\n--- ERROR AT {request.url} ---\\n")
        f.write(error_msg)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

@app.get("/")
def root():
    return {"message": "Welcome to Pharma ERP+CRM API"}
