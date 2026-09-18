import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { routeMap } from '../../lib/routes';

export function AppShell() {
  const stylist = useAuthStore((s) => s.stylist);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const active = (prefix: string) => location.pathname.startsWith(prefix) ? 'active' : '';

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to={routeMap.dashboard} className="brand">HAIR TWIN</Link>
        <nav>
          <Link className={active(routeMap.dashboard)} to={routeMap.dashboard}>대시보드</Link>
          <Link className={active(routeMap.customers)} to={routeMap.customers}>고객</Link>
          <Link className={active(routeMap.presets)} to={routeMap.presets}>프리셋</Link>
        </nav>
        <div className="topbar-right">
          <span>{stylist?.name ?? '디자이너'} 디자이너</span>
          <button className="ghost" onClick={logout}>로그아웃</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
