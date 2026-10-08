import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AppShell, PrimaryButton } from './components/ui';
import { useAuth } from './stores/baseStores';
import { LoginPage, DashboardPage, CustomersPage, CustomerDetailPage, RecordDetailPage, PresetsPage, PresetEditPage } from './pages/core';
import { StartPage, IntentPage, PhotoPage, StylePage, ConditionPage, GenerationPage } from './pages/flow1';
import { CandidatesPage, FeedbackPage, InterpretationPage, ComparisonPage, StylistReviewPage, FinalizePage, ReportPage } from './pages/flow2';
import { routeMap, useConsult } from './stores/consultationStore';

function RequireAuth({ children }: { children: JSX.Element }) {
  const loggedIn = useAuth((s) => s.loggedIn);
  const loc = useLocation();
  const hydrated = useConsult(s => s.hydrated);
  if (!loggedIn && loc.pathname !== '/login') return <Navigate to="/login" replace />;
  if (!hydrated) return <AppShell><p>상담 데이터를 불러오는 중…</p></AppShell>;
  return children;
}

class Boundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) {
      return (
        <AppShell>
          <div className="text-center py-16">
            <p className="text-[22px] font-bold">문제가 발생했습니다.</p>
            <p className="text-secondary mt-2">당황하지 마세요. 상담 데이터는 유지됩니다.</p>
            <div className="flex gap-2 justify-center mt-6">
              <button onClick={() => location.reload()} className="min-h-[52px] px-6 rounded-2xl border border-line font-semibold">다시 시도</button>
              <Link to="/dashboard" className="min-h-[52px] px-6 rounded-2xl bg-primary text-white font-semibold flex items-center">대시보드로 이동</Link>
            </div>
          </div>
        </AppShell>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <AppShell>
      <div className="text-center py-16">
        <p className="text-[22px] font-bold">페이지를 찾을 수 없습니다.</p>
        <div className="mt-6 inline-block"><PrimaryButton to="/dashboard">대시보드로 이동</PrimaryButton></div>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <Boundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/customers" element={<RequireAuth><CustomersPage /></RequireAuth>} />
          <Route path="/customers/:customerId" element={<RequireAuth><CustomerDetailPage /></RequireAuth>} />
          <Route path="/records/:recordId" element={<RequireAuth><RecordDetailPage /></RequireAuth>} />
          <Route path="/presets" element={<RequireAuth><PresetsPage /></RequireAuth>} />
          <Route path="/presets/new" element={<RequireAuth><PresetEditPage /></RequireAuth>} />
          <Route path="/presets/:presetId/edit" element={<RequireAuth><PresetEditPage /></RequireAuth>} />
          <Route path={routeMap.start} element={<RequireAuth><StartPage /></RequireAuth>} />
          <Route path={routeMap.intent} element={<RequireAuth><IntentPage /></RequireAuth>} />
          <Route path={routeMap.photo} element={<RequireAuth><PhotoPage /></RequireAuth>} />
          <Route path={routeMap.style} element={<RequireAuth><StylePage /></RequireAuth>} />
          <Route path={routeMap.condition} element={<RequireAuth><ConditionPage /></RequireAuth>} />
          <Route path={routeMap.generation} element={<RequireAuth><GenerationPage /></RequireAuth>} />
          <Route path={routeMap.candidates} element={<RequireAuth><CandidatesPage /></RequireAuth>} />
          <Route path={routeMap.feedback} element={<RequireAuth><FeedbackPage /></RequireAuth>} />
          <Route path={routeMap.interpretation} element={<RequireAuth><InterpretationPage /></RequireAuth>} />
          <Route path={routeMap.comparison} element={<RequireAuth><ComparisonPage /></RequireAuth>} />
          <Route path={routeMap.stylistReview} element={<RequireAuth><StylistReviewPage /></RequireAuth>} />
          <Route path={routeMap.finalize} element={<RequireAuth><FinalizePage /></RequireAuth>} />
          <Route path={routeMap.report} element={<RequireAuth><ReportPage /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Boundary>
  );
}
