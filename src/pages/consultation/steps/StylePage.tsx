import { useState } from 'react';
import { Page } from '../../../components/common/Page';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { presetRepository } from '../../../repositories/presetRepository';
import { BANG_QUICK_PRESETS, getBangLengthHelper, getBangLengthLabel } from '../../../lib/bangLength';
import type { HairCondition } from '../../../types/consultation';

export default function StylePage() {
  const presets = presetRepository.getAll();
  const draft = useConsultationStore(s => s.draft);
  const selected = draft?.selectedPresetId;
  const setPreset = useConsultationStore(s => s.setPreset);
  const setBangLength = useConsultationStore(s => s.setBangLength);
  const setCondition = useConsultationStore(s => s.setHairCondition);
  const bang = draft?.bangLength ?? 50;
  const gender = draft?.gender;
  const { transitionTo } = useConsultationNavigation();

  const [state, setState] = useState<HairCondition['state']>(draft?.hairCondition?.state ?? 'healthy');
  const [sideHair, setSideHair] = useState<HairCondition['sideHairBehavior']>(draft?.hairCondition?.sideHairBehavior ?? 'medium-volume');

  const visible = presets.filter(p => !gender || p.target === 'unisex' || p.target === gender);

  function next() {
    setCondition({
      state, thickness: draft?.hairCondition?.thickness ?? 'normal', texture: draft?.hairCondition?.texture ?? 'straight',
      density: draft?.hairCondition?.density ?? 'normal', elasticity: draft?.hairCondition?.elasticity ?? 'normal',
      strandFeel: draft?.hairCondition?.strandFeel ?? 'normal', history: draft?.hairCondition?.history ?? ['none'],
      sideHairBehavior: sideHair,
    });
    transitionTo('generation');
  }

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">05 · 스타일 프리셋 설정 + 세부 설정 {gender ? (gender === 'female' ? '(여성)' : '(남성)') : ''}</p>
    <h1>프리셋을 고르고 세부 길이를 정해주세요.</h1>
    <div className="preset-grid">{visible.map(p => <button key={p.id} className={`preset-card ${selected === p.id ? 'selected' : ''}`} onClick={() => setPreset(p.id)}>
      {p.referenceImages[0] && <img className="preset-thumb" src={p.referenceImages[0]} alt="" />}
      <div><strong>{p.name}</strong><span>{p.description}</span><small>{p.tags.join(' · ')}</small></div>
    </button>)}</div>
    {!visible.length && <p className="muted">해당 성별 프리셋이 없습니다.</p>}
    <div className="panel bang-panel">
      <div className="section-heading bang-heading"><div><p className="eyebrow">DETAIL</p><h2>세부 설정</h2><p>앞머리 길이 + 모발 상태(손상·옆머리 뜸)를 함께 저장합니다.</p></div><div className="bang-current"><span>현재</span><strong>{getBangLengthLabel(bang)}</strong></div></div>
      <label className="range-field bang-range-field">
        <span className="sr-only">앞머리 길이</span>
        <input aria-label="앞머리 길이" type="range" min="0" max="100" value={bang} onChange={e => setBangLength(Number(e.target.value))}/>
        <div className="bang-range-labels"><span>눈썹 위</span><span>눈썹 위치</span><span>눈썹 아래</span></div>
      </label>
      <div className="bang-helper"><strong>{getBangLengthLabel(bang)}</strong><span>{getBangLengthHelper(bang)}</span></div>
      <div className="quick-row">{BANG_QUICK_PRESETS.map(preset => <button className={`chip ${getBangLengthLabel(bang) === preset.label ? 'selected' : ''}`} key={preset.value} onClick={() => setBangLength(preset.value)}>{preset.label}</button>)}</div>
      <div className="condition-grid" style={{ marginTop: 12 }}>
        <label className="select-row"><span>모발 손상</span><select value={state} onChange={e => setState(e.target.value as HairCondition['state'])}>
          <option value="healthy">healthy</option><option value="dry">dry</option><option value="damaged">damaged</option><option value="severely-damaged">severely-damaged</option>
        </select></label>
        <label className="select-row"><span>옆머리 뜸</span><select value={sideHair} onChange={e => setSideHair(e.target.value as HairCondition['sideHairBehavior'])}>
          <option value="low-volume">low-volume</option><option value="medium-volume">medium-volume</option><option value="high-volume">high-volume</option><option value="very-high-volume">very-high-volume</option>
        </select></label>
      </div>
    </div>
    <button className="primary wide" disabled={!selected} onClick={next}>이미지 생성 (초안)</button>
  </section></Page></StepGuard>;
}
