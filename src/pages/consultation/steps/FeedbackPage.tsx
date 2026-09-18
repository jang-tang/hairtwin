import { useMemo, useState } from 'react';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { RegionEditor } from '../../../components/image/RegionEditor';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { aiService } from '../../../services/ai/aiService';
import type { Feedback, ImageVersion } from '../../../types/consultation';
import type { ImageRegion, ImageRegionType } from '../../../types/image';

const quick = ['앞머리가 너무 짧아 보여요.', '옆머리가 많이 떠 보여요.', '뒤가 너무 무거워 보여요.', '조금 더 자연스럽게 해주세요.'];
const regionTypes: ImageRegionType[] = ['fringe', 'side', 'crown', 'back', 'all'];
const regionLabels: Record<ImageRegionType, string> = { fringe: '앞머리', side: '옆머리', crown: '윗머리', back: '뒷머리', all: '전체' };

export default function FeedbackPage() {
  const draft = useConsultationStore(s => s.draft);
  const addFeedback = useConsultationStore(s => s.addFeedback);
  const setRegions = useConsultationStore(s => s.setRegions);
  const addVersion = useConsultationStore(s => s.addVersion);
  const setFinalStyle = useConsultationStore(s => s.setFinalStyle);
  const { transitionTo } = useConsultationNavigation();
  const [view, setView] = useState<'front' | 'side' | 'back'>('front');
  const [regions, setLocalRegions] = useState<ImageRegion[]>(draft?.selectedRegions?.length ? draft.selectedRegions : [
    { id: 'region-1', type: 'fringe', x: .28, y: .16, width: .44, height: .24, view: 'front' },
  ]);
  const [activeId, setActiveId] = useState('region-1');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const images = useMemo(() => ({
    front: draft?.finalStyle?.frontImage ?? draft?.hairPhotos.front?.url ?? '',
    side: draft?.finalStyle?.sideImage ?? draft?.hairPhotos.side?.url ?? '',
    back: draft?.finalStyle?.backImage ?? draft?.hairPhotos.back?.url ?? '',
  }), [draft]);
  const active = regions.find(r => r.id === activeId) ?? regions[0];

  function updateActive(patch: Partial<ImageRegion>) {
    setLocalRegions(prev => prev.map(r => r.id === activeId ? { ...r, ...patch, view } : r));
  }

  function addRegion() {
    const id = `region-${Date.now()}`;
    setLocalRegions(prev => [...prev, { id, type: 'side', x: .3, y: .3, width: .4, height: .3, view }]);
    setActiveId(id);
  }

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const feedback: Feedback = {
        id: crypto.randomUUID(), text: text.trim(),
        selectedRegions: regions.map(r => ({ ...r })),
        createdAt: new Date().toISOString(),
      };
      addFeedback(feedback); setRegions(regions.map(r => ({ ...r })));

      // 초안이 있으면 영역별 수정사항으로 3면 개선 시도 (실패해도 최종 단계로 이동)
      const final = draft?.finalStyle;
      if (draft && final?.frontImageId && final.sideImageId && final.backImageId) {
        try {
          const edited = await aiService.editStyleImage({
            sourceVersion: draft.versions.length + 1,
            sourceImageIds: { front: final.frontImageId, side: final.sideImageId, back: final.backImageId },
            feedbackText: feedback.text,
            selectedRegions: feedback.selectedRegions,
            bangLength: draft.bangLength,
            hairAttributes: draft.hairCondition,
          });
          const version: ImageVersion = {
            id: crypto.randomUUID(), version: draft.versions.length + 2,
            frontImage: edited.frontImage, sideImage: edited.sideImage, backImage: edited.backImage,
            frontImageId: edited.frontImageId, sideImageId: edited.sideImageId, backImageId: edited.backImageId,
            feedback, createdAt: new Date().toISOString(),
          };
          addVersion(version);
          setFinalStyle({ ...final, frontImage: version.frontImage, sideImage: version.sideImage, backImage: version.backImage, frontImageId: version.frontImageId, sideImageId: version.sideImageId, backImageId: version.backImageId });
        } catch { /* mock/서버 실패 시 초안 유지 */ }
      }
      transitionTo('finalize');
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정 반영 실패');
    } finally { setBusy(false); }
  }

  function skip() { setRegions(regions); transitionTo('finalize'); }

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">07 · 영역별 수정사항 (그림 그리기)</p><h1>고치고 싶은 곳을 그려주세요.</h1>
    <p className="muted">박스를 드래그해 영역을 그리고, 영역별 종류를 지정한 뒤 수정 내용을 적어주세요.</p>
    <div className="segmented">
      {(['front', 'side', 'back'] as const).map(v => <button key={v} className={view === v ? 'selected' : ''} onClick={() => setView(v)}>{v === 'front' ? '앞' : v === 'side' ? '옆' : '뒤'}</button>)}
    </div>
    <div className="feedback-editor">
      {images[view] && active
        ? <RegionEditor src={images[view]} region={{ ...active, view }} onChange={next => updateActive(next)} />
        : <div className="photo-placeholder"><strong>이미지 없음</strong><span>초안이 생성되지 않았습니다.</span></div>}
      <div className="feedback-copy">
        <div className="quick-row">
          {regions.map(r => <button key={r.id} className={`chip ${r.id === activeId ? 'selected' : ''}`} onClick={() => { setActiveId(r.id); if (r.view) setView(r.view); }}>{regionLabels[r.type]} · {r.view === 'front' ? '앞' : r.view === 'side' ? '옆' : '뒤'}</button>)}
          <button className="chip" onClick={addRegion}>+ 영역 추가</button>
        </div>
        {active && <label className="select-row"><span>영역 종류</span><select value={active.type} onChange={e => updateActive({ type: e.target.value as ImageRegionType })}>{regionTypes.map(t => <option key={t} value={t}>{regionLabels[t]}</option>)}</select></label>}
        <div className="quick-row">{quick.map(item => <button className="chip" key={item} onClick={() => setText(item)}>{item}</button>)}</div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="예) 앞머리 영역은 눈썹 아래로, 옆머리 영역은 다운되게" />
        {error && <p className="error">{error}</p>}
        <div className="button-row">
          <button className="secondary" onClick={skip}>수정 없이 확정</button>
          <button className="primary" onClick={submit} disabled={!text.trim() || busy}>{busy ? '반영 중…' : '반영하고 최종 확인'}</button>
        </div>
      </div>
    </div>
  </section></Page></StepGuard>;
}
