#!/bin/bash

# Pharma ERP+CRM Development Startup Script

echo "🚀 Starting Pharma ERP+CRM development environment..."

# 1. Clear stale PostgreSQL locks
echo "🧹 Checking for stale PostgreSQL locks..."
PG_LOCK="/usr/local/var/postgresql@14/postmaster.pid"
if [ -f "$PG_LOCK" ]; then
    PG_PID=$(cat "$PG_LOCK")
    if ! ps -p "$PG_PID" > /dev/null; then
        echo "⚠️  Stale lock detected (PID $PG_PID not running). Removing $PG_LOCK..."
        rm "$PG_LOCK"
    fi
fi

# 2. Ensure PostgreSQL is running
echo "🐘 Starting PostgreSQL service..."
brew services start postgresql@14

# 3. Kill existing processes on key ports
echo "🔫 Cleaning up ports 8000, 5173, and 5174..."
lsof -ti:8000,5173,5174 | xargs kill -9 2>/dev/null || true

# 4. Start Backend
echo "🌐 Starting Backend on port 8000..."
cd backend
# Check if virtualenv exists
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
fi
nohup uvicorn app.main:app --reload --port 8000 > backend.log 2>&1 &
echo "✅ Backend started (logs in backend/backend.log)"
cd ..

# 5. Start Frontend
echo "💻 Starting Frontend..."
cd frontend
nohup npm run dev > frontend.log 2>&1 &
echo "✅ Frontend started (logs in frontend/frontend.log)"
cd ..

echo "✨ Environment initialized!"
echo "   - Frontend: http://localhost:5173 (or 5174)"
echo "   - Backend API: http://localhost:8000/api/v1"
echo "   - Swagger UI: http://localhost:8000/docs"
echo ""
echo "Use 'tail -f backend/backend.log' or 'tail -f frontend/frontend.log' to see logs."
