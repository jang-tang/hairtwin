import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/common/Page';
import { customerRepository } from '../../repositories/customerRepository';
import { consultationRepository } from '../../repositories/consultationRepository';
import { routeMap } from '../../lib/routes';

export default function CustomersPage() {
  const [query, setQuery] = useState('');
  const customers = useMemo(() => customerRepository.search(query), [query]);
  return (
    <Page>
      <div className="page-heading"><div><p className="eyebrow">CUSTOMERS</p><h1>고객 관리</h1><p>고객별 상담 기록과 최종 스타일을 한 곳에서 확인합니다.</p></div></div>
      <input className="search" placeholder="고객 이름 / 전화번호 검색" value={query} onChange={e => setQuery(e.target.value)} />
      <section className="panel">
        {customers.map(customer => {
          const reports = consultationRepository.getByCustomerId(customer.id);
          const latest = reports.at(-1);
          return <div className="list-row" key={customer.id}>
            <div><strong>{customer.name}</strong><span>{customer.phone ?? '전화번호 없음'} · 상담 {reports.length}회{latest ? ` · ${latest.finalStyle.name}` : ''}</span></div>
            <Link className="secondary compact" to={`/customers/${customer.id}`}>상세</Link>
          </div>;
        })}
      </section>
      <Link className="primary" to={`${routeMap.consultationStart}?customerId=${customers[0]?.id ?? 'c-1'}`}>+ 새 고객 상담</Link>
    </Page>
  );
}
