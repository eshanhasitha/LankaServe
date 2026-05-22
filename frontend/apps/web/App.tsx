import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/public/LandingPage.tsx';
import LoginPage from './pages/public/LoginPage.tsx';
import RegisterPage from './pages/public/RegisterPage.tsx';
import PublicInfoPage from './pages/public/PublicInfoPage.tsx';
import CustomerLayout from './layouts/CustomerLayout.tsx';
import ProviderLayout from './layouts/ProviderLayout.tsx';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage.tsx';
import CustomerPostServicePage from './pages/customer/CustomerPostServicePage.tsx';
import CustomerMyJobsPage from './pages/customer/CustomerMyJobsPage.tsx';
import CustomerJobDetailsPage from './pages/customer/CustomerJobDetailsPage.tsx';
import CustomerFindProvidersPage from './pages/customer/CustomerFindProvidersPage.tsx';
import CustomerProviderProfilePage from './pages/customer/CustomerProviderProfilePage.tsx';
import CustomerHeatmapPage from './pages/customer/CustomerHeatmapPage.tsx';
import CustomerMessagesPage from './pages/customer/CustomerMessagesPage.tsx';
import CustomerNotificationsPage from './pages/customer/CustomerNotificationsPage.tsx';
import CustomerHelpPage from './pages/customer/CustomerHelpPage.tsx';
import CustomerSettingsPage from './pages/customer/CustomerSettingsPage.tsx';
import ProviderDashboardPage from './pages/provider/ProviderDashboardPage.tsx';
import ProviderBrowseJobsPage from './pages/provider/ProviderBrowseJobsPage.tsx';
import ProviderJobRequestsPage from './pages/provider/ProviderJobRequestsPage.tsx';
import ProviderMyJobsPage from './pages/provider/ProviderMyJobsPage.tsx';
import ProviderJobDetailsPage from './pages/provider/ProviderJobDetailsPage.tsx';
import ProviderNotificationsPage from './pages/provider/ProviderNotificationsPage.tsx';
import ProviderEarningsPage from './pages/provider/ProviderEarningsPage.tsx';
import ProviderBadgesPage from './pages/provider/ProviderBadgesPage.tsx';
import ProviderMessagesPage from './pages/provider/ProviderMessagesPage.tsx';
import ProviderAnalyticsPage from './pages/provider/ProviderAnalyticsPage.tsx';
import ProviderHelpPage from './pages/provider/ProviderHelpPage.tsx';
import ProviderSettingsPage from './pages/provider/ProviderSettingsPage.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import RoleHomeRedirect from './components/RoleHomeRedirect.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/find-a-pro" element={<PublicInfoPage pageKey="findPro" />} />
      <Route path="/become-a-pro" element={<PublicInfoPage pageKey="becomePro" />} />
      <Route path="/how-it-works" element={<PublicInfoPage pageKey="howItWorks" />} />
      <Route path="/service-areas" element={<PublicInfoPage pageKey="serviceAreas" />} />
      <Route path="/help-center" element={<PublicInfoPage pageKey="helpCenter" />} />
      <Route path="/safety-guide" element={<PublicInfoPage pageKey="safetyGuide" />} />
      <Route path="/contact" element={<PublicInfoPage pageKey="contact" />} />
      <Route path="/terms" element={<PublicInfoPage pageKey="terms" />} />
      <Route path="/privacy" element={<PublicInfoPage pageKey="privacy" />} />
      <Route path="/cookies" element={<PublicInfoPage pageKey="cookies" />} />

      <Route path="/home" element={<ProtectedRoute allowedRoles={["customer", "provider", "admin"]}><RoleHomeRedirect /></ProtectedRoute>} />

      <Route path="/customer" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboardPage />} />
        <Route path="post-service" element={<CustomerPostServicePage />} />
        <Route path="post-a-service" element={<Navigate to="/customer/post-service" replace />} />
        <Route path="post" element={<Navigate to="/customer/post-service" replace />} />
        <Route path="my-jobs" element={<CustomerMyJobsPage />} />
        <Route path="my-jobs/:jobId" element={<CustomerJobDetailsPage />} />
        <Route path="jobs" element={<Navigate to="/customer/my-jobs" replace />} />
        <Route path="find-providers" element={<CustomerFindProvidersPage />} />
        <Route path="providers/:providerId" element={<CustomerProviderProfilePage />} />
        <Route path="search-providers" element={<Navigate to="/customer/find-providers" replace />} />
        <Route path="providers" element={<Navigate to="/customer/find-providers" replace />} />
        <Route path="heatmap" element={<CustomerHeatmapPage />} />
        <Route path="messages" element={<CustomerMessagesPage />} />
        <Route path="notifications" element={<CustomerNotificationsPage />} />
        <Route path="alerts" element={<Navigate to="/customer/notifications" replace />} />
        <Route path="help-center" element={<CustomerHelpPage />} />
        <Route path="settings" element={<CustomerSettingsPage />} />
      </Route>

      <Route path="/provider" element={<ProtectedRoute allowedRoles={["provider"]}><ProviderLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProviderDashboardPage />} />
        <Route path="browse-jobs" element={<ProviderBrowseJobsPage />} />
        <Route path="job-requests" element={<ProviderJobRequestsPage />} />
        <Route path="my-jobs" element={<ProviderMyJobsPage />} />
        <Route path="jobs/:jobId" element={<ProviderJobDetailsPage />} />
        <Route path="notifications" element={<ProviderNotificationsPage />} />
        <Route path="earnings" element={<ProviderEarningsPage />} />
        <Route path="badges" element={<ProviderBadgesPage />} />
        <Route path="messages" element={<ProviderMessagesPage />} />
        <Route path="analytics" element={<ProviderAnalyticsPage />} />
        <Route path="help-center" element={<ProviderHelpPage />} />
        <Route path="settings" element={<ProviderSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

