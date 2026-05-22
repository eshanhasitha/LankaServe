import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.tsx';
import AdminLayout from './layouts/AdminLayout.tsx';
import AdminDashboardPage from './pages/AdminDashboardPage.tsx';
import AdminUsersPage from './pages/AdminUsersPage.tsx';
import AdminProvidersPage from './pages/AdminProvidersPage.tsx';
import AdminJobsPage from './pages/AdminJobsPage.tsx';
import AdminQrLogsPage from './pages/AdminQrLogsPage.tsx';
import AdminReviewsPage from './pages/AdminReviewsPage.tsx';
import AdminAddsPage from './pages/AdminAddsPage.tsx';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.tsx';
import AdminBadgeRulesPage from './pages/AdminBadgeRulesPage.tsx';
import AdminBroadcastPage from './pages/AdminBroadcastPage.tsx';
import AdminReportsPage from './pages/AdminReportsPage.tsx';
import AdminBackupPage from './pages/AdminBackupPage.tsx';
import AdminSettingsPage from './pages/AdminSettingsPage.tsx';
import ProtectedAdminRoute from './components/ProtectedAdminRoute.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="providers" element={<AdminProvidersPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="qr-logs" element={<AdminQrLogsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="adds" element={<AdminAddsPage />} />

        <Route path="insights/analytics" element={<AdminAnalyticsPage />} />
        <Route path="insights/badge-rules" element={<AdminBadgeRulesPage />} />
        <Route path="insights/broadcast" element={<AdminBroadcastPage />} />

        <Route path="system/reports" element={<AdminReportsPage />} />
        <Route path="system/backup" element={<AdminBackupPage />} />
        <Route path="system/settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

