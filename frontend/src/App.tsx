// Automated deployment test to heartly.uz
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ProductPage from './features/products/ProductPage';
import MedRepsPage from './features/med-reps/MedRepsPage';
import MedRepDetailPage from './features/med-reps/MedRepDetailPage';
import RegionsPage from './features/regions/RegionsPage';
import MedOrgsPage from './features/med-orgs/MedOrgsPage';
import DoctorsPage from './features/doctors/DoctorsPage';
import ReservationsPage from './features/reservations/ReservationsPage';
import InvoicesPage from './features/invoices/InvoicesPage';
import PaymentsPage from './features/payments/PaymentsPage';
import DebtorsPage from './features/debtors/DebtorsPage';
import StatsPage from './features/stats/StatsPage';
import ManufacturerPage from './features/manufacturers/ManufacturerPage';
import ProductManagerPage from './features/product-managers/ProductManagerPage';
import ProductManagerDetailPage from './features/product-managers/ProductManagerDetailPage';
import AdminBonusApprovalPage from "./features/reports/AdminBonusApprovalPage";
import DeputyDirectorsPage from './features/deputy-directors/DeputyDirectorsPage';
import ReportsPage from './features/reports/ReportsPage';
import AuditPage from './features/audit/AuditPage';
import HeadOfOrdersPage from './features/head-of-orders/HeadOfOrdersPage';
import HeadOfOrdersManagementPage from './features/head-of-orders/ManagementPage';
import WarehouseManagementPage from './features/warehouse/WarehouseManagementPage';
import DeletionApprovalPage from './features/warehouse/DeletionApprovalPage';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/deputy-directors" element={<DeputyDirectorsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/bonuses" element={<AdminBonusApprovalPage />} />
            <Route path="/product-managers" element={<ProductManagerPage />} />
            <Route path="/product-managers/:id" element={<ProductManagerDetailPage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route path="/med-reps" element={<MedRepsPage />} />
            <Route path="/med-reps/:id" element={<MedRepDetailPage />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/med-orgs" element={<MedOrgsPage />} />
            <Route path="/manufacturers" element={<ManufacturerPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/debtors" element={<DebtorsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/head-of-orders" element={<HeadOfOrdersPage />} />
            <Route path="/head-of-orders-management" element={<HeadOfOrdersManagementPage />} />
            <Route path="/warehouse" element={<WarehouseManagementPage />} />
            <Route path="/deletion-approval" element={<DeletionApprovalPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
