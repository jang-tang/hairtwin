import { useState } from 'react';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { getBangLengthLabel } from '../../../lib/bangLength';

export default function FinalizePage() {
  const draft = useConsultationStore(s => s.draft);
  const setFinal = useConsultationStore(s => s.setFinalStyle);
  const { transitionTo } = useConsultationNavigation();
  const [note, setNote] = useState(draft?.notes ?? '');
  const setNotes = useConsultationStore(s => s.setNotes);

  if (!draft || !draft.finalStyle) {
    return <StepGuard><Page><div className="empty-state"><h1>선택된 스타일이 없습니다.</h1></div></Page></StepGuard>;
  }

  const currentDraft = draft;
  const final = currentDraft.finalStyle!;
  const adjustment = currentDraft.stylistAdjustment;

  const images = [final.frontImage, final.sideImage, final.backImage].filter(Boolean) as string[];
  const improved = currentDraft.versions.at(-1);

  function complete() {
    setNotes(note);
    setFinal({
      ...final,
      name: final.name,
      bangLength: currentDraft.bangLength,
      sideHairVolume: adjustment?.sideHairVolume ?? 'natural',
      curlStrength: adjustment?.curlStrength ?? 'medium',
    });
    transitionTo('report');
  }

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">08 · 최종 이미지</p>
    <h1>이 스타일로 확정할까요?</h1>
    {improved && <p className="muted">영역별 수정이 반영된 V{improved.version}입니다.</p>}
    <div className="three-images final-images">{images.map((src, i) => <figure key={src}><img src={src} alt={`final-${i}`} /><figcaption>{['앞','옆','뒤'][i]}</figcaption></figure>)}</div>
    <div className="panel"><h2>{final.name}</h2><p>{final.description}</p><div className="detail-list"><span>앞머리</span><strong>{getBangLengthLabel(currentDraft.bangLength)}</strong><span>옆머리</span><strong>{adjustment?.sideHairVolume === 'down' ? '다운' : '자연스럽게'}</strong><span>컬</span><strong>{adjustment?.curlStrength ?? 'medium'}</strong></div>
    <textarea placeholder="최종 메모 (시술 시 참고)" value={note} onChange={e => setNote(e.target.value)} /></div>
    <div className="button-row">
      <button className="secondary" onClick={() => transitionTo('feedback')}>다시 수정</button>
      <button className="primary" onClick={complete}>확정하고 시술 단계로</button>
    </div>
  </section></Page></StepGuard>;
}
