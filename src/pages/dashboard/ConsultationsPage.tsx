import { Link } from 'react-router-dom';
import { Page } from '../../components/common/Page';
import { consultationRepository } from '../../repositories/consultationRepository';
import { customerRepository } from '../../repositories/customerRepository';

export default function ConsultationsPage() {
  const reports = consultationRepository.getAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Page><div className="page-heading"><div><p className="eyebrow">CONSULTATIONS</p><h1>상담 내역</h1></div></div><section className="panel">{reports.map(report => <div className="list-row" key={report.id}><div><strong>{customerRepository.getById(report.customerId)?.name ?? report.customerId}</strong><span>{report.finalStyle.name} · {report.createdAt}</span></div><Link className="secondary compact" to={`/customers/${report.customerId}`}>열기</Link></div>)}{!reports.length && <p className="muted">완료된 상담이 없습니다.</p>}</section></Page>;
}
