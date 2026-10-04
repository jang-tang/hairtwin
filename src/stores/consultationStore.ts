import { create } from 'zustand';
import type { Candidate, HairCondition, Region, RegionType, SideHair, TriView } from '../types';
import { img } from '../data';
import { bangLabel } from '../data';
import { isMockMode, mockTriView } from '../mocks/mockImages';

export type Step =
  | 'start' | 'intent' | 'photo' | 'style' | 'condition'
  | 'generation' | 'candidates' | 'feedback' | 'interpretation'
  | 'comparison' | 'stylistReview' | 'finalize' | 'report';

export const routeMap: Record<Step, string> = {
  start: '/consultations/new/start',
  intent: '/consultations/new/intent',
  photo: '/consultations/new/photo',
  style: '/consultations/new/style',
  condition: '/consultations/new/condition',
  generation: '/consultations/new/generation',
  candidates: '/consultations/new/candidates',
  feedback: '/consultations/new/feedback',
  interpretation: '/consultations/new/interpretation',
  comparison: '/consultations/new/comparison',
  stylistReview: '/consultations/new/stylist-review',
  finalize: '/consultations/new/finalize',
  report: '/consultations/new/report'
};
export const stepOrder: Step[] = ['start','intent','photo','style','condition','generation','candidates','feedback','interpretation','comparison','stylistReview','finalize','report'];

interface ConsultationState {
  step: Step;
  customerName: string;
  customerPhone: string;
  customerType: 'new' | 'existing';
  intent: string;
  photos: { front: string | null; side: string | null; back: string | null };
  presetId: string | null;
  myPresets: { id: string; name: string }[];
  condition: HairCondition;
  sideHair: SideHair;
  bang: number;
  candidates: Candidate[];
  selectedCandidate: string | null;
  viewTab: 'front' | 'side' | 'back';
  region: Region | null;
  quickEdits: string[];
  freeText: string;
  versions: { id: string; label: string; views: TriView }[];
  chosenVersion: string;
  stylist: { curl: string; sideControl: string; possible: string; notes: string[]; memo: string };
  set: (p: Partial<ConsultationState>) => void;
  reset: () => void;
}

const triView = (seed: string, title: string, sub = ''): TriView =>
  isMockMode()
    ? mockTriView(seed, title, sub)
    : { front: img(seed + 'f'), side: img(seed + 's'), back: img(seed + 'b') };

const initVersions = (seed: string): ConsultationState['versions'] => [
  { id: 'v1', label: 'V1', views: triView(seed + 'v1', 'V1 · 첫 제안') },
  { id: 'v2', label: 'V2', views: triView(seed + 'v2', 'V2 · 다듬은 안') }
];

export const useConsult = create<ConsultationState>()((set) => ({
  step: 'start',
  customerName: '김민지', customerPhone: '', customerType: 'new',
  intent: '',
  photos: { front: null, side: null, back: null },
  presetId: null,
  myPresets: [{ id: 'my1', name: '지수쌤 시그니처 레이어드' }],
  condition: { damage: '건강', texture: '직모', thickness: '보통', density: '보통', elasticity: '보통', feel: '보통' },
  sideHair: '자연스럽게 떨어짐',
  bang: 45,
  candidates: [],
  selectedCandidate: null,
  viewTab: 'front',
  region: { id: 'r1', type: 'fringe', x: 0.3, y: 0.22, w: 0.4, h: 0.18, label: '앞머리' },
  quickEdits: [],
  freeText: '',
  versions: initVersions('htv'),
  chosenVersion: 'v2',
  stylist: { curl: '중', sideControl: '다운', possible: '가능', notes: [], memo: '' },
  set: (p) => set(p),
  reset: () => set({
    step: 'start', intent: '', photos: { front: null, side: null, back: null },
    presetId: null, candidates: [], selectedCandidate: null, quickEdits: [], freeText: '',
    versions: initVersions('htv' + Date.now()), chosenVersion: 'v2', bang: 45,
    region: { id: 'r1', type: 'fringe', x: 0.3, y: 0.22, w: 0.4, h: 0.18, label: '앞머리' }
  })
}));

// 중앙 navigation: state + URL을 한 곳에서 처리 (spec §57)
export function transitionTo(step: Step, navigate: (to: string) => void) {
  useConsult.getState().set({ step });
  navigate(routeMap[step]);
}

export function makeCandidates(presetSeed: string): Candidate[] {
  const defs = [
    { id: 'A', name: '내추럴 시스루', desc: '가볍고 자연스러운 앞머리' },
    { id: 'B', name: '소프트 레이어드', desc: '옆선이 부드럽게 떨어짐' },
    { id: 'C', name: '볼륨 보브', desc: '단정하고 세련된 라인' }
  ];
  return defs.map((d) => ({
    ...d,
    views: triView(`${presetSeed}${d.id}`, `후보 ${d.id} · ${d.name}`, d.desc)
  }));
}

// 피드백 적용 후: 목업/실서버 모두 V(n+1)을 새로 생성해 비교 흐름을 이어간다.
// 목업 모드에서는 앞머리 수치·빠른조정이 이미지 라벨에 그대로 반영되어 변화를 눈으로 확인 가능하다.
export function appendEditedVersion() {
  const s = useConsult.getState();
  const n = s.versions.length + 1;
  const id = `v${n}`;
  const sub = `앞머리 ${bangLabel(s.bang)} · ${s.quickEdits[0] ?? '자연스럽게'}`;
  const views = triView(`edit${Date.now()}${n}`, `${s.candidates.find((c) => c.id === s.selectedCandidate)?.name ?? '선택 스타일'}`, sub);
  s.set({ versions: [...s.versions, { id, label: `V${n}`, views }], chosenVersion: id });
}

export function setRegionType(t: RegionType) {
  const presets: Record<RegionType, { x: number; y: number; w: number; h: number; label: string }> = {
    fringe: { x: 0.3, y: 0.22, w: 0.4, h: 0.18, label: '앞머리' },
    side: { x: 0.12, y: 0.3, w: 0.25, h: 0.4, label: '옆머리' },
    crown: { x: 0.32, y: 0.08, w: 0.36, h: 0.2, label: '정수리' },
    back: { x: 0.25, y: 0.45, w: 0.5, h: 0.35, label: '뒷머리' },
    all: { x: 0.15, y: 0.08, w: 0.7, h: 0.72, label: '전체' }
  };
  const p = presets[t];
  useConsult.getState().set({ region: { id: 'r1', type: t, ...p } });
}
