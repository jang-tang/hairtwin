import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Candidate, HairCondition, Region, RegionType, SideHair } from '../types';
import type { ImageVersion, GenerationResult, StylistReview } from '../../server/src/providers/image/types';
import { indexedStorage } from '../storage/indexedStorage';

export type Step = 'start' | 'intent' | 'photo' | 'style' | 'condition' | 'generation' | 'candidates' | 'feedback' | 'interpretation' | 'comparison' | 'stylistReview' | 'finalize' | 'report';
export const routeMap: Record<Step, string> = {
  start: '/consultations/new/start', intent: '/consultations/new/intent', photo: '/consultations/new/photo',
  style: '/consultations/new/style', condition: '/consultations/new/condition', generation: '/consultations/new/generation',
  candidates: '/consultations/new/candidates', feedback: '/consultations/new/feedback', interpretation: '/consultations/new/interpretation',
  comparison: '/consultations/new/comparison', stylistReview: '/consultations/new/stylist-review',
  finalize: '/consultations/new/finalize', report: '/consultations/new/report',
};
export const stepOrder: Step[] = ['start','intent','photo','style','condition','generation','candidates','feedback','interpretation','comparison','stylistReview','finalize','report'];

interface ConsultationState {
  hydrated: boolean; step: Step; customerName: string; customerPhone: string; customerType: 'new' | 'existing';
  intent: string; photos: { front: string | null; side: string | null; back: string | null };
  presetId: string | null; myPresets: { id: string; name: string }[]; condition: HairCondition;
  sideHair: SideHair; bang: number; sideLength: number; candidates: Candidate[]; selectedCandidate: string | null;
  viewTab: 'front' | 'side' | 'back'; region: Region | null; quickEdits: string[]; freeText: string;
  versions: ImageVersion[]; chosenVersion: string; sessionId: string | null;
  generationRequestId: string; aiMock: boolean; summary: string;
  generationJobId: string; editJobId: string; editRequestId: string;
  stylist: Omit<StylistReview, 'versionId' | 'possible'> & { versionId: string; possible: StylistReview['possible'] | '' };
  set: (p: Partial<ConsultationState>) => void; reset: () => void;
  acceptGeneration: (result: GenerationResult) => void;
  selectCandidate: (id: string) => void; chooseVersion: (id: string) => void;
}
function initial() {
  return {
    step: 'start' as Step, customerName: '김민지', customerPhone: '', customerType: 'new' as const,
    intent: '', photos: { front: null, side: null, back: null }, presetId: null, myPresets: [],
    condition: { damage: '건강', texture: '직모', thickness: '보통', density: '보통', elasticity: '보통', feel: '보통' } as HairCondition,
    sideHair: '자연스럽게 떨어짐' as SideHair, bang: 45, sideLength: 50,
    candidates: [] as Candidate[], selectedCandidate: null, viewTab: 'front' as const,
    region: { id: 'r1', type: 'fringe', x: .3, y: .22, w: .4, h: .18, label: '앞머리' } as Region,
    quickEdits: [] as string[], freeText: '', versions: [] as ImageVersion[], chosenVersion: '',
    sessionId: null, generationRequestId: '', aiMock: true, summary: '',
    generationJobId: '', editJobId: '', editRequestId: '',
    stylist: { versionId: '', curl: '중' as const, sideControl: '자연스럽게' as const, possible: '' as const, notes: [] as string[], memo: '' },
  };
}
export const useConsult = create<ConsultationState>()(persist((set, get) => ({
  ...initial(), hydrated: false,
  set: p => set(p), reset: () => set(initial()),
  acceptGeneration: result => set({ sessionId: result.sessionId, candidates: result.candidates, versions: result.versions,
    aiMock: result.mock, selectedCandidate: null, chosenVersion: '', summary: '', generationJobId: '', editJobId: '',
    stylist: initial().stylist }),
  selectCandidate: id => {
    const version = [...get().versions].reverse().find(v => v.candidateId === id);
    if (version) get().chooseVersion(version.id);
  },
  chooseVersion: id => {
    const v = get().versions.find(v => v.id === id);
    if (!v) return;
    set({ chosenVersion: v.id, selectedCandidate: v.candidateId, aiMock: v.mock, summary: v.summary,
      ...(get().chosenVersion !== v.id ? { stylist: initial().stylist, editJobId: '', editRequestId: '' } : {}),
      bang: v.settings.bang, sideLength: v.settings.sideLength, sideHair: v.settings.sideHair as SideHair,
      condition: v.settings.condition, quickEdits: v.feedback, freeText: v.freeText });
  },
}), {
  name: 'ht-consult-draft', storage: createJSONStorage(() => indexedStorage),
  partialize: ({ hydrated: _, set: _set, reset: _reset, acceptGeneration: _accept, selectCandidate: _select, chooseVersion: _choose, ...state }) => state,
  onRehydrateStorage: () => () => { useConsult.getState().set({ hydrated: true }); },
}));
export function validReview() {
  const s = useConsult.getState();
  return s.stylist.versionId === s.chosenVersion && !!s.stylist.possible &&
    (s.stylist.possible === '가능' || !!s.stylist.memo.trim());
}
export function transitionTo(step: Step, navigate: (to: string) => void) {
  useConsult.getState().set({ step }); navigate(routeMap[step]);
}
export function appendEditedVersion(version: ImageVersion) {
  const s = useConsult.getState();
  s.set({ versions: s.versions.some(v => v.id === version.id) ? s.versions : [...s.versions, version] });
  s.chooseVersion(version.id);
}
export function setRegionType(type: RegionType) {
  const presets: Record<RegionType, { x: number; y: number; w: number; h: number; label: string }> = {
    fringe: { x: .3, y: .22, w: .4, h: .18, label: '앞머리' },
    side: { x: .12, y: .3, w: .25, h: .4, label: '옆머리' },
    crown: { x: .32, y: .08, w: .36, h: .2, label: '정수리' },
    back: { x: .25, y: .45, w: .5, h: .35, label: '뒷머리' },
    all: { x: 0, y: 0, w: 1, h: 1, label: '전체' },
  };
  useConsult.getState().set({ region: { id: 'r1', type, ...presets[type] } });
}
