import { Link } from 'react-router-dom';
import { Page } from '../../components/common/Page';
import { routeMap } from '../../lib/routes';
import { customerRepository } from '../../repositories/customerRepository';
import { consultationRepository } from '../../repositories/consultationRepository';
import { presetRepository } from '../../repositories/presetRepository';
import { useConsultationStore } from '../../store/consultationStore';

export default function DashboardPage() {
  const customers = customerRepository.getAll();
  const reports = consultationRepository.getAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const presets = presetRepository.getAll();
  const hasActiveDraft = useConsultationStore(s => Boolean(s.draft));
  return (
    <Page>
      <section className="hero dashboard-hero">
        <div>
          <p className="eyebrow">HAIR TWIN · PROFESSIONAL WORKSPACE</p>
          <h1>안녕하세요, 지수 디자이너님.</h1>
          <p>로그인 → 대시보드 → 새작업 순서로 시작합니다.</p>
        </div>
        <Link className="primary" to={`${routeMap.consultationStart}?customerId=${customers[0]?.id ?? 'c-1'}`}>+ 새작업</Link>
      </section>

      <div className="kpi-row">
        <div><span>새작업 후보</span><strong>{customers.length.toString().padStart(2, '0')}</strong></div>
        <div><span>고객 정보</span><strong>{customers.length.toString().padStart(2, '0')}</strong></div>
        <div><span>저장 정보</span><strong>{reports.length.toString().padStart(2, '0')}</strong></div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">NEW TASK</p><h2>새작업</h2></div><Link to={routeMap.consultations}>전체 보기</Link></div>
          <p className="muted">새 상담을 시작하거나 진행 중 초안을 이어가세요. {hasActiveDraft ? '이어갈 초안이 있습니다.' : ''}</p>
          <div className="list-stack">
            {customers.slice(0, 3).map((customer) => (
              <div className="list-row" key={customer.id}>
                <div><strong>{customer.name}</strong><span>{customer.memo ?? '메모 없음'}</span></div>
                <Link className="secondary compact" to={`${routeMap.consultationStart}?customerId=${customer.id}`}>시작하기</Link>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">CUSTOMERS</p><h2>고객 정보</h2></div><Link to={routeMap.customers}>전체 보기</Link></div>
          <div className="list-stack">
            {customers.slice(0, 4).map((customer) => (
              <div className="list-row" key={customer.id}>
                <div><strong>{customer.name}</strong><span>{customer.phone ?? ''} · {customer.memo ?? ''}</span></div>
                <Link className="secondary compact" to={`/customers/${customer.id}`}>열기</Link>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">SAVED</p><h2>저장 정보</h2></div><Link to={routeMap.consultations}>전체 보기</Link></div>
          <div className="list-stack">
            {reports.slice(0, 4).map((report) => (
              <div className="list-row" key={report.id}>
                <div><strong>{customers.find(c => c.id === report.customerId)?.name ?? report.customerId}</strong><span>{report.finalStyle.name} · {report.createdAt}</span></div>
                <Link className="secondary compact" to={`/customers/${report.customerId}`}>열기</Link>
              </div>
            ))}
            {!reports.length && <p className="muted">아직 완료된 상담이 없습니다. 시술 후 저장하면 여기에 쌓입니다.</p>}
            <div className="list-row"><div><strong>프리셋 {presets.length}개</strong><span>스타일 프리셋 설정</span></div><Link className="secondary compact" to={routeMap.presets}>관리</Link></div>
          </div>
        </section>
      </div>
    </Page>
  );
}
