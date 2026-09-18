import type { HairPhotos, ImageRegion, ImageSource } from './image';
import type { FinalStyle, StyleCandidateSet } from './style';

export type CustomerIntent = 'maintain' | 'change' | 'new' | 'explore';
/** 손글씨 프로세스: 1. 다듬어주세요 / 2. 새로운 스타일 (기존 intent 값을 재사용) */
export type ServiceMode = 'trim' | 'new-style';
export type CustomerGender = 'male' | 'female';
export type CustomerType = 'first' | 'returning';
export type HairConditionState = 'healthy' | 'dry' | 'damaged' | 'severely-damaged';
export type HairLevel = 'low' | 'normal' | 'high';
export type HairTexture = 'straight' | 'wavy' | 'curly';
export type SideHairBehavior = 'low-volume' | 'medium-volume' | 'high-volume' | 'very-high-volume';

export type HairCondition = {
  state: HairConditionState;
  thickness: HairLevel;
  texture: HairTexture;
  density: HairLevel;
  elasticity: HairLevel;
  strandFeel: 'soft' | 'normal' | 'coarse';
  history: Array<'color' | 'bleach' | 'perm' | 'down-perm' | 'straight-perm' | 'none'>;
  sideHairBehavior: SideHairBehavior;
};

export type Feedback = {
  id: string;
  text: string;
  selectedRegions: ImageRegion[];
  createdAt: string;
};

export type FeedbackInterpretation = {
  summary: string;
  adjustments: Array<{ label: string; amount?: number; detail?: string }>;
};

export type ImageVersion = {
  id: string;
  version: number;
  frontImage: string;
  sideImage: string;
  backImage: string;
  frontImageId?: string;
  sideImageId?: string;
  backImageId?: string;
  feedback?: Feedback;
  createdAt: string;
};

export type StylistAdjustment = {
  sideHairVolume: 'natural' | 'down';
  curlStrength: 'light' | 'medium' | 'strong';
  note?: string;
};

export type ConsultationReport = {
  id: string;
  customerId: string;
  stylistId: string;
  createdAt: string;
  hairPhotos: HairPhotos;
  intent: CustomerIntent | null;
  serviceMode?: ServiceMode | null;
  gender?: CustomerGender | null;
  customerType?: CustomerType | null;
  isFirstVisit?: boolean;
  referenceImage?: ImageSource | null;
  hairCondition: HairCondition | null;
  selectedPreset?: string;
  candidates: StyleCandidateSet[];
  versions: ImageVersion[];
  customerFeedback: Feedback[];
  stylistAdjustments: StylistAdjustment[];
  finalStyle: FinalStyle;
  notes: string;
  serviceType?: string;
  expectedDuration?: number;
  estimatedPrice?: number;
  consent: boolean;
};

export type ConsultationDraft = {
  id: string;
  customerId: string;
  stylistId: string;
  intent: CustomerIntent | null;
  /** if 처음이면 블록 */
  isFirstVisit: boolean;
  gender: CustomerGender | null;
  customerType: CustomerType | null;
  /** 1. 원하는 스타일 사진 */
  referenceImage: ImageSource | null;
  /** 1. 다듬어주세요 / 2. 새로운 스타일 */
  serviceMode: ServiceMode | null;
  hairPhotos: HairPhotos;
  hairCondition: HairCondition | null;
  selectedPresetId?: string;
  bangLength: number;
  selectedRegions: ImageRegion[];
  candidates: StyleCandidateSet[];
  feedback: Feedback[];
  interpretations: FeedbackInterpretation[];
  versions: ImageVersion[];
  currentVersionIndex: number;
  finalStyle: FinalStyle | null;
  stylistAdjustment: StylistAdjustment | null;
  notes: string;
};

export type ImageUploadSource = ImageSource;
