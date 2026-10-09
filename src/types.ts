export type RegionType = 'fringe' | 'side' | 'crown' | 'back' | 'all';
export interface Region { id: string; type: RegionType; x: number; y: number; w: number; h: number; label: string; }
export interface TriView { front: string; side: string; back: string; }
export interface Candidate { id: string; name: string; desc: string; views: TriView; versionId?: string; }
export interface HairCondition {
  damage: '건강' | '건조' | '손상' | '극손상';
  texture: '직모' | '반곱슬' | '곱슬';
  thickness: '가늘음' | '보통' | '굵음';
  density: '낮음' | '보통' | '높음';
  elasticity: '낮음' | '보통' | '높음';
  feel: '부드러움' | '보통' | '거침';
}
export type SideHair = '자연스럽게 떨어짐' | '조금 뜸' | '많이 뜸' | '매우 많이 뜸';
export interface Customer { id: string; name: string; phone?: string; lastVisit?: string; historyCount: number; }
export interface ConsultationRecord {
  id: string; customerName: string; date: string; styleName: string;
  views: TriView; intent: string; adjustments: string[]; condition: HairCondition | null;
  sessionId?: string; selectedVersionId?: string;
  stylistReview?: import('../server/src/providers/image/types').StylistReview;
}
export const REGION_LABEL: Record<RegionType, string> = {
  fringe: '앞머리', side: '옆머리', crown: '정수리', back: '뒷머리', all: '전체'
};
export const QUICK_OPTIONS: Record<RegionType, string[]> = {
  fringe: ['더 길게', '더 짧게', '더 가볍게', '더 풍성하게'],
  side: ['자연스럽게', '조금 다운', '많이 다운', '볼륨 유지'],
  crown: ['볼륨 늘리기', '볼륨 줄이기', '유지'],
  back: ['조금 가볍게', '무겁게', '길게', '짧게'],
  all: ['가볍게', '차분하게', '볼륨감 있게']
};
