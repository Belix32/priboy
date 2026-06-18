import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePartner?: boolean;
  requireAuth?: boolean;
}

export function RouteGuard({ children, requireAdmin, requirePartner, requireAuth }: RouteGuardProps) {
  const { isAuthenticated, isLoading, hasAdminAccess, isPartner } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !hasAdminAccess) {
    return <Navigate to="/login" replace />;
  }

  if (requirePartner && !isPartner) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
