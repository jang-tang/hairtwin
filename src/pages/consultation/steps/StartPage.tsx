import { useLocation } from 'react-router-dom';
import { Page } from '../../../components/common/Page';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { useAuthStore } from '../../../store/authStore';
import { customerRepository } from '../../../repositories/customerRepository';

export default function StartPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const customerId = params.get('customerId') ?? 'c-1';
  const customer = customerRepository.getById(customerId);
  const stylist = useAuthStore(s => s.stylist);
  const { start, transitionTo } = useConsultationNavigation();

  return <Page centered><div className="step-card">
    <p className="eyebrow">01 · CONSULTATION START</p>
    <h1>오늘의 상담을 시작할게요.</h1>
    <div className="info-block"><span>고객</span><strong>{customer?.name ?? '고객'}</strong><span>담당 디자이너</span><strong>{stylist?.name ?? '지수'}</strong></div>
    <button className="primary wide" onClick={() => { start(customer?.id ?? customerId, stylist?.id ?? 'stylist-1'); transitionTo('firstVisit'); }}>상담 시작</button>
  </div></Page>;
}
