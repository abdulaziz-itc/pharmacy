# Backend API Documentation

The backend is built with FastAPI and provides the core business logic, database management, and authentication for the Pharma system.

## 🛠 Tech Stack
- **Python 3.13+**
- **FastAPI**: Modern, high-performance web framework.
- **SQLAlchemy (Async)**: ORM for PostgreSQL.
- **Alembic**: Database migrations.
- **Pydantic V2**: Data validation and serialization.

## 📂 Project Structure
- `app/api/`: API endpoints, organized by version and feature (CRM, Sales, etc.).
- `app/crud/`: CRUD (Create, Read, Update, Delete) logic.
- `app/models/`: SQLAlchemy database models.
- `app/schemas/`: Pydantic models for request/response validation.
- `app/db/`: Database session and base class setup.
- `alembic/versions/`: Database migration scripts.

## 🔐 Authentication
Authentication is handled via JWT. The `deps.get_current_user` dependency is used to protect endpoints and retrieve the authenticated user's role.

## 📊 Database Migrations
Migrations are critical. Always check `alembic/versions` before updating. If you add a field to a model, run:
```bash
alembic revision --autogenerate -m "Add field X"
alembic upgrade head
```

## 📝 Logging
- **`error_log.txt`**: Global exception logger.
- **`uvicorn.log`**: Access logs.
