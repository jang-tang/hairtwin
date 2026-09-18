import { useState } from 'react';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { aiService } from '../../../services/ai/aiService';
import type { ImageVersion } from '../../../types/consultation';

function ViewStrip({ title, images }: { title: string; images: string[] }) {
  return <div><h3>{title}</h3><div className="three-images">{images.map((src, i) => <figure key={`${title}-${src}`}><img src={src} alt={`${title}-${i}`} /><figcaption>{['앞','옆','뒤'][i]}</figcaption></figure>)}</div></div>;
}

export default function ComparisonPage() {
  const draft = useConsultationStore(s => s.draft);
  const addVersion = useConsultationStore(s => s.addVersion);
  const { transitionTo } = useConsultationNavigation();
  const [status, setStatus] = useState<'idle'|'loading'|'error'>('idle');
  const [error, setError] = useState('');

  async function improve() {
    const final = draft?.finalStyle;
    if (!draft || !final?.frontImageId || !final.sideImageId || !final.backImageId) { setError('현재 선택된 스타일의 원본 이미지 정보를 찾을 수 없습니다.'); return; }
    setStatus('loading'); setError('');
    try {
      const edited = await aiService.editStyleImage({
        sourceVersion: draft.versions.length + 1,
        sourceImageIds: { front: final.frontImageId, side: final.sideImageId, back: final.backImageId },
        feedbackText: draft.feedback.at(-1)?.text ?? '',
        selectedRegions: draft.selectedRegions,
        bangLength: draft.bangLength,
        hairAttributes: draft.hairCondition,
      });
      const version: ImageVersion = {
        id: crypto.randomUUID(), version: draft.versions.length + 2,
        frontImage: edited.frontImage, sideImage: edited.sideImage, backImage: edited.backImage,
        frontImageId: edited.frontImageId, sideImageId: edited.sideImageId, backImageId: edited.backImageId,
        feedback: draft.feedback.at(-1), createdAt: new Date().toISOString(),
      };
      addVersion(version); transitionTo('finalize');
    } catch (e) { setError(e instanceof Error ? e.message : '이미지 편집에 실패했습니다.'); setStatus('error'); }
  }

  const v1 = draft?.finalStyle ? [draft.finalStyle.frontImage, draft.finalStyle.sideImage, draft.finalStyle.backImage].filter(Boolean) as string[] : [];
  const v2 = draft?.versions.at(-1) ? [draft.versions.at(-1)!.frontImage, draft.versions.at(-1)!.sideImage, draft.versions.at(-1)!.backImage] : [];
  return <StepGuard><Page><section className="step-section"><p className="eyebrow">10 · 3-WAY COMPARISON</p><h1>변경 전과 변경 후를 비교해보세요.</h1><div className="version-grid"><ViewStrip title="현재 선택 스타일" images={v1}/><ViewStrip title={v2.length ? `개선안 V${draft!.versions.at(-1)!.version}` : '아직 개선안 없음'} images={v2}/></div><div className="button-row"><button className="secondary" onClick={() => transitionTo('feedback')}>조금 더 수정</button><button className="primary" onClick={improve} disabled={status === 'loading'}>{status === 'loading' ? '3면 개선 중…' : '3면 개선 생성'}</button></div>{error && <p className="error">{error}</p>}</section></Page></StepGuard>;
}
