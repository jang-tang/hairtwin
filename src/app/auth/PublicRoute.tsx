import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { routeMap } from '../../lib/routes';

export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to={routeMap.dashboard} replace /> : <Outlet />;
}
