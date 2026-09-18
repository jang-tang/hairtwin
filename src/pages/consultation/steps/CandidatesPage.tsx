import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';

export default function CandidatesPage() {
  const candidates = useConsultationStore(s => s.draft?.candidates ?? []);
  const setFinalStyle = useConsultationStore(s => s.setFinalStyle);
  const { transitionTo } = useConsultationNavigation();
  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">07 · AI CANDIDATES</p><h1>완성된 1세트를 확인해보세요.</h1><p>하나의 스타일을 정면·옆·뒤 세 방향으로 확인합니다.</p>
    <div className="candidate-grid">{candidates.slice(0, 1).map(candidate => <article className="candidate-card" key={candidate.id}><div className="candidate-images">{[[candidate.frontImage,'앞'],[candidate.sideImage,'옆'],[candidate.backImage,'뒤']].map(([src,label]) => <figure key={String(src)}><img src={String(src)} alt={`${candidate.title} ${label}`} /><figcaption>{label}</figcaption></figure>)}</div><div className="card-body"><div><strong>{candidate.title}</strong><p>{candidate.description}</p></div><button className="primary" onClick={() => { setFinalStyle({ presetId: undefined, name: candidate.title, description: candidate.description, frontImage: candidate.frontImage, sideImage: candidate.sideImage, backImage: candidate.backImage, frontImageId: candidate.frontImageId, sideImageId: candidate.sideImageId, backImageId: candidate.backImageId }); transitionTo('feedback'); }}>이 스타일 선택</button></div></article>)}</div>
  </section></Page></StepGuard>;
}
