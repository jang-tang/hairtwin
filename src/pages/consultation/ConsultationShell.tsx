import { Link, Outlet, useLocation } from 'react-router-dom';
import { routeMap, stepLabels } from '../../lib/routes';
import { stepOrder } from '../../lib/routes';

export default function ConsultationShell() {
  const location = useLocation();
  const index = Math.max(0, stepOrder.findIndex((step) => routeMap[step] === location.pathname));
  const percent = Math.round(((index + 1) / stepOrder.length) * 100);
  const label = stepLabels[stepOrder[index] ?? 'consultationStart'];

  return (
    <div className="consultation-shell">
      <div className="consultation-topbar">
        <Link to={routeMap.dashboard} className="brand">HAIR TWIN</Link>
        <div className="progress-meta">상담 {index + 1} / {stepOrder.length} · {label}</div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
      </div>
      <Outlet />
    </div>
  );
}
