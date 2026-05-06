import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';

export default function ProtectedAdminRoute({ children }) {
  const { initialized, isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!initialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

