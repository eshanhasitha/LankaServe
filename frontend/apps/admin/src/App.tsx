import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProvidersPage from './pages/AdminProvidersPage';
import ProtectedAdminRoute from './components/protectedAdminRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedAdminRoute>
            <AdminUsersPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/providers"
        element={
          <ProtectedAdminRoute>
            <AdminProvidersPage />
          </ProtectedAdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}