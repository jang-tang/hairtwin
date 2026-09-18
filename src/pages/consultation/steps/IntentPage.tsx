import { Page } from '../../../components/common/Page';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';

const options = [
  { mode: 'trim' as const, intent: 'maintain' as const, title: '1. 다듬어주세요', description: '현재 스타일 유지 + 정리·무게·길이 조절' },
  { mode: 'new-style' as const, intent: 'new' as const, title: '2. 새로운 스타일', description: '프리셋 + 세부 설정으로 완전히 새로운 방향' },
];

export default function IntentPage() {
  const selected = useConsultationStore(s => s.draft?.serviceMode);
  const setServiceMode = useConsultationStore(s => s.setServiceMode);
  const { transitionTo } = useConsultationNavigation();
  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">03 · SERVICE BRANCH</p><h1>오늘은 어떻게 해드릴까요?</h1>
    <div className="choice-grid">{options.map(o => <button key={o.mode} className={`choice-card ${selected === o.mode ? 'selected' : ''}`} onClick={() => setServiceMode(o.mode, o.intent)}><strong>{o.title}</strong><span>{o.description}</span></button>)}</div>
    <button className="primary wide" disabled={!selected} onClick={() => transitionTo('photo')}>다음: 현재 머리 촬영</button>
  </section></Page></StepGuard>;
}
