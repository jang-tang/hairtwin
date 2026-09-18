import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConsultationDraft, CustomerGender, CustomerIntent, CustomerType, Feedback, FeedbackInterpretation,
  HairCondition, ImageVersion, ServiceMode, StylistAdjustment,
} from '../types/consultation';
import type { HairPhotos, ImageRegion, ImageSource } from '../types/image';
import type { FinalStyle, StyleCandidateSet } from '../types/style';

const emptyPhotos: HairPhotos = { front: null, side: null, back: null };

const createDraft = (customerId: string, stylistId: string): ConsultationDraft => ({
  id: crypto.randomUUID(),
  customerId,
  stylistId,
  intent: null,
  isFirstVisit: false,
  gender: null,
  customerType: null,
  referenceImage: null,
  serviceMode: null,
  hairPhotos: { ...emptyPhotos },
  hairCondition: null,
  selectedPresetId: undefined,
  bangLength: 50,
  selectedRegions: [],
  candidates: [],
  feedback: [],
  interpretations: [],
  versions: [],
  currentVersionIndex: -1,
  finalStyle: null,
  stylistAdjustment: null,
  notes: '',
});

type ConsultationState = {
  draft: ConsultationDraft | null;
  start: (customerId: string, stylistId: string) => void;
  setIntent: (intent: CustomerIntent) => void;
  setServiceMode: (mode: ServiceMode, intent: CustomerIntent) => void;
  setFirstVisit: (patch: Partial<Pick<ConsultationDraft, 'isFirstVisit' | 'gender' | 'customerType'>>) => void;
  setReferenceImage: (source: ImageSource | null) => void;
  setPhoto: (view: keyof HairPhotos, source: ImageSource) => void;
  setHairCondition: (condition: HairCondition) => void;
  setPreset: (presetId: string) => void;
  setBangLength: (value: number) => void;
  setRegions: (regions: ImageRegion[]) => void;
  setCandidates: (candidates: StyleCandidateSet[]) => void;
  addFeedback: (feedback: Feedback) => void;
  addInterpretation: (interpretation: FeedbackInterpretation) => void;
  addVersion: (version: ImageVersion) => void;
  setCurrentVersion: (index: number) => void;
  setStylistAdjustment: (adjustment: StylistAdjustment) => void;
  setFinalStyle: (style: FinalStyle) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
};

export const useConsultationStore = create<ConsultationState>()(
  persist(
    (set) => ({
      draft: null,
      start(customerId, stylistId) { set({ draft: createDraft(customerId, stylistId) }); },
      setIntent(intent) { set((s) => s.draft ? { draft: { ...s.draft, intent } } : s); },
      setServiceMode(serviceMode, intent) { set((s) => s.draft ? { draft: { ...s.draft, serviceMode, intent } } : s); },
      setFirstVisit(patch) { set((s) => s.draft ? { draft: { ...s.draft, ...patch } } : s); },
      setReferenceImage(referenceImage) { set((s) => s.draft ? { draft: { ...s.draft, referenceImage } } : s); },
      setPhoto(view, source) { set((s) => s.draft ? { draft: { ...s.draft, hairPhotos: { ...s.draft.hairPhotos, [view]: source } } } : s); },
      setHairCondition(hairCondition) { set((s) => s.draft ? { draft: { ...s.draft, hairCondition } } : s); },
      setPreset(selectedPresetId) { set((s) => s.draft ? { draft: { ...s.draft, selectedPresetId } } : s); },
      setBangLength(bangLength) { set((s) => s.draft ? { draft: { ...s.draft, bangLength } } : s); },
      setRegions(selectedRegions) { set((s) => s.draft ? { draft: { ...s.draft, selectedRegions } } : s); },
      setCandidates(candidates) { set((s) => s.draft ? { draft: { ...s.draft, candidates } } : s); },
      addFeedback(feedback) { set((s) => s.draft ? { draft: { ...s.draft, feedback: [...s.draft.feedback, feedback] } } : s); },
      addInterpretation(interpretation) { set((s) => s.draft ? { draft: { ...s.draft, interpretations: [...s.draft.interpretations, interpretation] } } : s); },
      addVersion(version) { set((s) => s.draft ? { draft: { ...s.draft, versions: [...s.draft.versions, version], currentVersionIndex: s.draft.versions.length } } : s); },
      setCurrentVersion(currentVersionIndex) { set((s) => s.draft ? { draft: { ...s.draft, currentVersionIndex } } : s); },
      setStylistAdjustment(stylistAdjustment) { set((s) => s.draft ? { draft: { ...s.draft, stylistAdjustment } } : s); },
      setFinalStyle(finalStyle) { set((s) => s.draft ? { draft: { ...s.draft, finalStyle } } : s); },
      setNotes(notes) { set((s) => s.draft ? { draft: { ...s.draft, notes } } : s); },
      clear() { set({ draft: null }); },
    }),
    { name: 'hair-twin-consultation' },
  ),
);
