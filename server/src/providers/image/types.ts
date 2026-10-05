export const VIEW_KEYS = ['front', 'side', 'back'] as const;
export type View = typeof VIEW_KEYS[number];
export interface TriView { front: string; side: string; back: string }
export interface HairCondition {
  damage: '건강' | '건조' | '손상' | '극손상'; texture: '직모' | '반곱슬' | '곱슬';
  thickness: '가늘음' | '보통' | '굵음'; density: '낮음' | '보통' | '높음';
  elasticity: '낮음' | '보통' | '높음'; feel: '부드러움' | '보통' | '거침';
}
export interface RegionHint {
  id: string; type: 'fringe' | 'side' | 'crown' | 'back' | 'all';
  x: number; y: number; w: number; h: number; label: string;
}
export interface StylePreset {
  id: string; name: string; desc: string; category?: string; length?: string;
  bang?: string; perm?: string; color?: string; memo?: string; refImages?: string[];
}
export interface HairSettings { bang: number; sideLength: number; sideHair: string; condition: HairCondition }
export interface GenerateInput extends HairSettings {
  requestId: string; customerName: string; photos: TriView; intent: string;
  preset: StylePreset; presetId?: string; prompt?: string;
}
export interface GeneratedCandidate { id: string; name: string; desc: string; views: TriView; versionId?: string }
export interface EditRequest extends HairSettings {
  requestId: string; sessionId: string; baseVersionId: string;
  view: View; region: RegionHint | null; feedback: string[]; freeText: string;
}
export interface EditInput extends EditRequest {
  views: TriView; original: GenerateInput; candidate: { id: string; name: string; desc: string };
}
export interface ImageVersion {
  id: string; candidateId: string; label: string; parentId: string | null;
  createdAt: string; views: TriView; summary: string; mock: boolean;
  settings: HairSettings; feedback: string[]; freeText: string;
}
export interface GenerationResult {
  sessionId: string; candidates: GeneratedCandidate[]; versions: ImageVersion[];
  mock: boolean; provider: 'mock' | 'real';
}
export interface EditResult { version: ImageVersion; mock: boolean; provider: 'mock' | 'real'; summary: string }
export interface ImageProvider {
  readonly kind: 'mock' | 'real';
  generate(input: GenerateInput): Promise<{ candidates: GeneratedCandidate[]; mock: boolean }>;
  edit(input: EditInput): Promise<{ views: TriView; mock: boolean; summary: string }>;
}
