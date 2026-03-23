# Maintenance Guide

This document provides instructions for common maintenance tasks in the Pharma ERP + CRM system.

## 💾 Database Operations

### 🔄 Migrations (Alembic)
Whenever you change a model in `backend/app/models/`, you must update the database schema:

```bash
cd backend
alembic revision --autogenerate -m "description_of_change"
alembic upgrade head
```

### 📦 Backups
To backup the PostgreSQL database from the command line:
```bash
pg_dump -U username -h localhost dbname > backup_$(date +%Y-%m-%d).sql
```

## 🔍 Monitoring & Logs

### Backend Troubleshooting
*   **`backend/error_log.txt`**: Captures all Python/FastAPI exceptions.
*   **`backend/app.log`**: Application-specific business logic logs.
*   **`backend/uvicorn.log`**: Web server logs.

### Frontend Troubleshooting
*   Use browser console (F12) to check for failed API requests or JS errors.

## 🔄 Updating the System

### Push Updates to Server
1.  Commit and push changes to GitHub.
2.  SSH into cPanel or use Terminal:
    ```bash
    cd ~/repositories/pharmacy
    git pull origin main
    # Run migrations if models changed
    source ~/virtualenv/repositories/pharmacy/backend/3.13/bin/activate
    cd backend
    alembic upgrade head
    ```
3.  **RESTART the app**: Go to cPanel -> "Setup Python App" -> Click "Restart" icon.

## 🔑 Environment Variables
All configuration is stored in `.env` files. Ensure `.env` is NOT committed to Git.
*   `backend/.env`: DB URL, secret keys, CORS origins.
*   `frontend/.env.production`: Backend API URL (must be `https://backend.maax.uz/api/v1`).
