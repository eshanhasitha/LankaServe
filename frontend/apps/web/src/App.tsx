import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/public/LoginPage';
import CustomerLayout from './layouts/CustomerLayout';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import CustomerPostServicePage from './pages/customer/CustomerPostServicePage';
import CustomerMyJobsPage from './pages/customer/CustomerMyJobsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<Navigate to="/customer/dashboard" replace />} />
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<CustomerDashboardPage />} />
        <Route path="post-service" element={<CustomerPostServicePage />} />
        <Route path="my-jobs" element={<CustomerMyJobsPage />} />
      </Route>
      <Route path="/jobs/:jobId/provider" element={<ProviderJobDetailsPage />} />
<Route path="/jobs/:jobId/customer" element={<CustomerJobDetailsPage />} />+
    </Routes>
  );
}
