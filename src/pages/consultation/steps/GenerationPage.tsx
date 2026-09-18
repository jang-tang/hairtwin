import { useEffect, useRef, useState } from 'react';
import { Page } from '../../../components/common/Page';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { aiService } from '../../../services/ai/aiService';

export default function GenerationPage() {
  const draft = useConsultationStore(s => s.draft);
  const setCandidates = useConsultationStore(s => s.setCandidates);
  const setFinalStyle = useConsultationStore(s => s.setFinalStyle);
  const { transitionTo } = useConsultationNavigation();
  const [error, setError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const requestedDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    if (requestedDraftIdRef.current === draft.id) return;
    requestedDraftIdRef.current = draft.id;

    let cancelled = false;
    (async () => {
      try {
        if (!draft.hairPhotos.back || !draft.hairCondition || !draft.selectedPresetId) {
          throw new Error('뒷모습 사진·프리셋·세부 설정이 필요합니다.');
        }
        const candidates = await aiService.generateStyleCandidates({
          hairPhotos: draft.hairPhotos,
          intent: draft.serviceMode === 'trim' ? 'maintain' : (draft.intent ?? 'new'),
          selectedStylePreset: draft.selectedPresetId,
          hairCondition: draft.hairCondition,
          bangsLength: draft.bangLength,
          candidateCount: 1,
        });
        if (!cancelled) {
          const first = candidates.slice(0, 1);
          setCandidates(first);
          const c = first[0];
          if (c) {
            setFinalStyle({
              presetId: draft.selectedPresetId, name: c.title, description: c.description,
              frontImage: c.frontImage, sideImage: c.sideImage, backImage: c.backImage,
              frontImageId: c.frontImageId, sideImageId: c.sideImageId, backImageId: c.backImageId,
            });
          }
          transitionTo('feedback');
        }
      } catch (e) {
        requestedDraftIdRef.current = null;
        if (!cancelled) setError(e instanceof Error ? e.message : 'AI 생성 중 오류가 발생했습니다.');
      }
    })();

    return () => { cancelled = true; };
  }, [draft, retryNonce, setCandidates, setFinalStyle, transitionTo]);

  return <StepGuard><Page centered><div className="processing-card">
    <div className="ai-orb">AI</div>
    <p className="eyebrow">06 · 이미지 생성 (초안)</p>
    <h1>{error ? '생성에 문제가 생겼습니다.' : '초안 이미지 1장을 만들고 있어요.'}</h1>
    <p>{error || '프리셋 + 세부 설정(앞머리·모발)을 반영해 초안을 생성합니다.'}</p>
    {error && <button className="secondary" onClick={() => { setError(''); setRetryNonce(value => value + 1); }}>다시 시도</button>}
  </div></Page></StepGuard>;
}
