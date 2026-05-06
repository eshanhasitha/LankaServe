import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.tsx';

export default function RoleHomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  if (user?.role === 'provider') {
    return <Navigate to="/provider/dashboard" replace />;
  }

  if (user?.role === 'admin') {
    const adminUrl = import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5174/dashboard';
    window.location.replace(adminUrl);
    return null;
  }

  return <Navigate to="/login" replace />;
}

