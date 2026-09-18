import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import CustomersPage from '../pages/dashboard/CustomersPage';
import ConsultationsPage from '../pages/dashboard/ConsultationsPage';
import PresetsPage from '../pages/dashboard/PresetsPage';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage';
import ConsultationShell from '../pages/consultation/ConsultationShell';
import { consultationRoutes } from '../pages/consultation/steps';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicRoute } from './auth/PublicRoute';
import { routeMap } from '../lib/routes';
import { AppShell } from '../components/common/AppShell';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path={routeMap.login} element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path={routeMap.dashboard} element={<DashboardPage />} />
          <Route path={routeMap.customers} element={<CustomersPage />} />
          <Route path={routeMap.consultations} element={<ConsultationsPage />} />
          <Route path={routeMap.presets} element={<PresetsPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        </Route>

        <Route path="/consultations/new" element={<ConsultationShell />}>
          <Route index element={<Navigate to={routeMap.consultationStart} replace />} />
          {consultationRoutes.map(({ path, element }) => <Route key={path} path={path} element={element} />)}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={routeMap.dashboard} replace />} />
    </Routes>
  );
}
