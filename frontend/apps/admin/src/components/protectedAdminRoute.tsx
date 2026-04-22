import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context';
import type { ReactNode } from 'react';

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { session } = useAdminAuth();

  if (!session?.user) return <Navigate to="/login" replace />;
  if (session.user.role !== 'admin') return <Navigate to="/login" replace />;

  return children;
}