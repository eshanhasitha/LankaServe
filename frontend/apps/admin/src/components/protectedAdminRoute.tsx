import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const raw = localStorage.getItem('lanka.admin.auth');
  const session = raw ? JSON.parse(raw) as { user?: { role?: string } } : null;

  if (!session?.user || session.user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
}