# Frontend Dashboard Documentation

The frontend is a modern React application for managing pharmaceutical data, analytics, and sales.

## 🛠 Tech Stack
- **React (Vite)**: Fast build tool and dev server.
- **Zustand**: Lightweight state management for auth and data.
- **Tailwind CSS**: Utility-first CSS for styling.
- **ShadcnUI**: High-quality UI components.
- **React Router V6**: Client-side routing.
- **Axios**: HTTP client for API communication.

## 📂 Project Structure
- `src/features/`: Feature-based organization (Dashboard, Products, Sales, etc.).
- `src/store/`: Zustand stores for global state.
- `src/components/ui/`: Reusable UI components.
- `src/hooks/`: Custom React hooks.
- `src/lib/`: Utility libraries (axios config, shadcn helpers).

## 🚀 Environment
Configuration is in `.env` files:
- `VITE_API_URL`: Base URL for the backend API (e.g., `https://backend.maax.uz/api/v1`).

## 🔄 Deployment
To build for production:
```bash
npm run build
```
Upload the content of the `dist/` folder to your web server (`public_html`).
Refer to the root `MAINTENANCE.md` for more deployment details.
