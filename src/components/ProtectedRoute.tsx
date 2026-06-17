import { useEffect, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '../store';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, showToast } = useStore();
  const location = useLocation();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !hasShownToast.current) {
      showToast('请先登录后再访问', 'info');
      hasShownToast.current = true;
    } else if (adminOnly && user?.role !== 'admin' && isAuthenticated && !hasShownToast.current) {
      showToast('您没有权限访问该页面', 'error');
      hasShownToast.current = true;
    }
  }, [isAuthenticated, user, adminOnly, showToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
