import { useMemo, useState } from 'react';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import type { HairCondition } from '../../../types/consultation';

const initial: HairCondition = { state:'healthy', thickness:'normal', texture:'straight', density:'normal', elasticity:'normal', strandFeel:'normal', history:['none'], sideHairBehavior:'medium-volume' };
const historyOptions = ['none','color','bleach','perm','down-perm','straight-perm'] as const;
const options = {
  state: ['healthy','dry','damaged','severely-damaged'], thickness: ['low','normal','high'], texture: ['straight','wavy','curly'], density: ['low','normal','high'], elasticity: ['low','normal','high'], strandFeel: ['soft','normal','coarse'], sideHairBehavior: ['low-volume','medium-volume','high-volume','very-high-volume'],
} as const;
function SelectRow({ label, value, choices, onChange }: { label: string; value: string; choices: readonly string[]; onChange: (value: string) => void }) { return <label className="select-row"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}</select></label>; }

export default function ConditionPage() {
  const existing = useConsultationStore(s => s.draft?.hairCondition);
  const setCondition = useConsultationStore(s => s.setHairCondition);
  const { transitionTo } = useConsultationNavigation();
  const [condition, setConditionState] = useState<HairCondition>(existing ?? initial);
  const history = useMemo(() => [...historyOptions], []);
  const update = <K extends keyof HairCondition>(key: K, value: HairCondition[K]) => setConditionState(prev => ({ ...prev, [key]: value }));
  return <Page><section className="step-section">
    <p className="eyebrow">05 · HAIR CONDITION</p><h1>모발 상태를 확인해주세요.</h1><p>상담에 필요한 실제 모발 특성을 미용사 관점에서 기록합니다.</p>
    <div className="condition-grid">
      <SelectRow label="상태" value={condition.state} choices={options.state} onChange={v => update('state', v as HairCondition['state'])}/>
      <SelectRow label="모발 굵기" value={condition.thickness} choices={options.thickness} onChange={v => update('thickness', v as HairCondition['thickness'])}/>
      <SelectRow label="모질" value={condition.texture} choices={options.texture} onChange={v => update('texture', v as HairCondition['texture'])}/>
      <SelectRow label="밀도" value={condition.density} choices={options.density} onChange={v => update('density', v as HairCondition['density'])}/>
      <SelectRow label="탄력" value={condition.elasticity} choices={options.elasticity} onChange={v => update('elasticity', v as HairCondition['elasticity'])}/>
      <SelectRow label="모발 결" value={condition.strandFeel} choices={options.strandFeel} onChange={v => update('strandFeel', v as HairCondition['strandFeel'])}/>
      <SelectRow label="옆머리 뜸" value={condition.sideHairBehavior} choices={options.sideHairBehavior} onChange={v => update('sideHairBehavior', v as HairCondition['sideHairBehavior'])}/>
      <SelectRow label="모발 이력" value={condition.history[0] ?? 'none'} choices={history} onChange={v => update('history', [v as HairCondition['history'][number]])}/>
    </div>
    <button className="primary wide" onClick={() => { setCondition(condition); transitionTo('generation'); }}>AI 스타일 생성</button>
  </section></Page>;
}
