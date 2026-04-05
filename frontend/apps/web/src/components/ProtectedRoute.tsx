import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

type Props = {
  children: JSX.Element;
  allowedRoles?: Array<'customer' | 'provider' | 'admin'>;
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}
