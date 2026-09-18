import { useState } from 'react';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { getBangLengthLabel } from '../../../lib/bangLength';
import type { StylistAdjustment } from '../../../types/consultation';

const initialAdjustment: StylistAdjustment = { sideHairVolume: 'natural', curlStrength: 'medium', note: '' };

export default function StylistReviewPage() {
  const draft = useConsultationStore(s => s.draft);
  const setAdjustment = useConsultationStore(s => s.setStylistAdjustment);
  const { transitionTo } = useConsultationNavigation();
  const [adjustment, setLocal] = useState<StylistAdjustment>(() => draft?.stylistAdjustment ? {
    sideHairVolume: draft.stylistAdjustment.sideHairVolume ?? 'natural',
    curlStrength: draft.stylistAdjustment.curlStrength ?? 'medium',
    note: draft.stylistAdjustment.note ?? '',
  } : initialAdjustment);

  if (!draft) return null;

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">11 · STYLIST REVIEW</p>
    <h1>미용사 최종 검토</h1>
    <div className="panel">
      <div className="review-summary"><span>고객 요청</span><strong>{draft.feedback.at(-1)?.text ?? '없음'}</strong></div>
      <div className="locked-value"><span>앞머리 길이</span><div><strong>{getBangLengthLabel(draft.bangLength)}</strong><small>스타일 선택 단계에서 설정한 값으로 고정됩니다.</small></div></div>
      <label className="select-row"><span>옆머리</span><select value={adjustment.sideHairVolume} onChange={e => setLocal({ ...adjustment, sideHairVolume: e.target.value as StylistAdjustment['sideHairVolume'] })}><option value="natural">자연스럽게</option><option value="down">다운</option></select></label>
      <label className="select-row"><span>컬</span><select value={adjustment.curlStrength} onChange={e => setLocal({ ...adjustment, curlStrength: e.target.value as StylistAdjustment['curlStrength'] })}><option value="light">약</option><option value="medium">중</option><option value="strong">강</option></select></label>
      <label>미용사 메모<textarea value={adjustment.note ?? ''} onChange={e => setLocal({ ...adjustment, note: e.target.value })}/></label>
    </div>
    <button className="primary wide" onClick={() => { setAdjustment(adjustment); transitionTo('finalize'); }}>최종 방향 정리</button>
  </section></Page></StepGuard>;
}
