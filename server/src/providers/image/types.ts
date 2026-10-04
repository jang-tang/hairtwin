export interface TriView {
  front: string;
  side: string;
  back: string;
}

export interface RegionHint {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface GenerateInput {
  prompt?: string;
  presetId?: string;
  customerName?: string;
}

export interface GeneratedCandidate {
  id: string;
  name: string;
  desc: string;
  views: TriView;
}

export interface EditInput {
  image: string;
  region: RegionHint | null;
  bang: number;
  sideLength?: number;
  sideHair?: string;
  condition?: unknown;
  feedback: string[];
}

export interface ImageProvider {
  readonly kind: 'mock' | 'real';
  generate(input: GenerateInput): Promise<{ candidates: GeneratedCandidate[]; mock: boolean }>;
  edit(input: EditInput): Promise<{ ok: boolean; mock: boolean; summary: string }>;
}
