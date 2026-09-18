import { Link, useParams } from 'react-router-dom';
import { Page } from '../../components/common/Page';
import { customerRepository } from '../../repositories/customerRepository';
import { consultationRepository } from '../../repositories/consultationRepository';

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const customer = customerId ? customerRepository.getById(customerId) : null;
  const reports = customerId ? consultationRepository.getByCustomerId(customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  if (!customer) return <Page><div className="empty-state"><h1>고객을 찾을 수 없습니다.</h1></div></Page>;
  return <Page>
    <div className="page-heading"><div><p className="eyebrow">CUSTOMER PROFILE</p><h1>{customer.name}</h1><p>{customer.phone ?? '전화번호 없음'} · {customer.memo ?? '메모 없음'}</p></div><Link className="primary" to={`/consultations/new/start?customerId=${customer.id}`}>새 상담 시작</Link></div>
    <section className="profile-grid">
      <div className="panel"><h2>현재 프로필</h2><p>최근 상담 {reports.length}회</p>{reports[0] && <><p>최근 스타일 · {reports[0].finalStyle.name}</p><p>최근 상담일 · {reports[0].createdAt}</p></>}</div>
      <div className="panel"><h2>상담 이력</h2><div className="timeline">{reports.map(report => <article key={report.id}><span>{report.createdAt}</span><strong>{report.finalStyle.name}</strong><p>{report.notes || report.customerFeedback.at(-1)?.text || '메모 없음'}</p></article>)}{!reports.length && <p className="muted">아직 상담 이력이 없습니다.</p>}</div></div>
    </section>
  </Page>;
}
