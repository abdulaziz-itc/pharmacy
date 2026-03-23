# Pharma ERP + CRM System

A comprehensive ERP and CRM solution for pharmaceutical companies, featuring backend API, web dashboard, and mobile application.

## 🏗 Architecture Overview

The project is divided into three main components:

1.  **Backend (`/backend`)**:
    *   **Framework**: FastAPI (Python 3.13+)
    *   **Database**: PostgreSQL
    *   **ORM**: SQLAlchemy with Alembic for migrations
    *   **Auth**: JWT based authentication
    *   **Core Modules**: CRM (Doctors/Orgs), Sales (Reservations/Invoices), Inventory, Analytics.

2.  **Frontend (`/frontend`)**:
    *   **Framework**: React (Vite)
    *   **State Management**: Zustand
    *   **UI Components**: Tailwind CSS + ShadcnUI
    *   **Data Fetching**: Axios

3.  **Mobile (`/mobile`)**:
    *   **Framework**: Flutter
    *   **Platform**: Android & iOS
    *   **Core**: Cross-platform mobile app for MedReps.

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Mobile
```bash
cd mobile
flutter pub get
flutter run
```

## 🛠 Maintenance & Deployment

### Deployment (cPanel)
*   **Backend**: Managed via "Setup Python App" in cPanel (Phusion Passenger).
*   **Frontend**: Built with `npm run build` and files uploaded to `public_html`.
*   **Database**: PostgreSQL managed in cPanel.

### Troubleshooting
*   Check **`backend/error_log.txt`** for server-side exceptions.
*   Check **`backend/alembic/versions`** for database schema history.

---
See [MAINTENANCE.md](./MAINTENANCE.md) for detailed maintenance instructions.
