import { useEffect, useState } from 'react';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { aiService } from '../../../services/ai/aiService';
import type { FeedbackInterpretation } from '../../../types/consultation';

export default function InterpretationPage() {
  const draft = useConsultationStore(s => s.draft);
  const add = useConsultationStore(s => s.addInterpretation);
  const { transitionTo } = useConsultationNavigation();
  const [result, setResult] = useState<FeedbackInterpretation | null>(null);
  const [error, setError] = useState('');
  const latest = draft?.feedback.at(-1);

  useEffect(() => {
    if (!latest) return;
    let active = true;
    aiService.interpretFeedback({ feedbackText: latest.text, selectedRegions: latest.selectedRegions, hairAttributes: draft?.hairCondition ?? null })
      .then(value => active && setResult(value))
      .catch(e => active && setError(e instanceof Error ? e.message : '해석 실패'));
    return () => { active = false; };
  }, [latest, draft?.hairCondition]);

  if (error) return <Page centered><div className="processing-card"><h1>AI 해석에 실패했습니다.</h1><p>{error}</p><button className="secondary" onClick={() => window.location.reload()}>다시 시도</button></div></Page>;
  if (!result) return <Page centered><div className="processing-card"><div className="ai-orb">AI</div><h1>이 요청을 이해하고 있어요.</h1><p>고객의 표현을 스타일 조정 정보로 바꾸는 중입니다.</p></div></Page>;

  return <StepGuard><Page><section className="step-section"><p className="eyebrow">09 · AI INTERPRETATION</p><h1>이렇게 이해했어요.</h1><div className="interpretation-card"><p>{result.summary}</p>{result.adjustments.map((a, i) => <div className="adjustment" key={`${a.label}-${i}`}><strong>{a.label}</strong><span>{a.detail}{a.amount !== undefined ? ` · ${a.amount > 0 ? '+' : ''}${a.amount}` : ''}</span></div>)}</div><div className="button-row"><button className="secondary" onClick={() => transitionTo('feedback')}>다시 수정</button><button className="primary" onClick={() => { add(result); transitionTo('finalize'); }}>이대로 반영</button></div></section></Page></StepGuard>;
}
