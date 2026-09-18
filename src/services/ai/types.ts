import type { HairCondition, FeedbackInterpretation } from '../../types/consultation';
import type { HairPhotos, ImageRegion } from '../../types/image';
import type { StyleCandidateSet } from '../../types/style';

export type StyleGenerationInput = {
  hairPhotos: HairPhotos;
  intent: string;
  selectedStylePreset?: string;
  hairCondition: HairCondition;
  bangsLength: number;
  candidateCount?: number;
};

export type FeedbackInput = {
  feedbackText: string;
  selectedRegions: ImageRegion[];
  hairAttributes: HairCondition | null;
};

export type ImageEditInput = {
  sourceVersion: number;
  sourceImageIds: { front: string; side: string; back: string };
  feedbackText: string;
  selectedRegions: ImageRegion[];
  bangLength: number;
  hairAttributes: HairCondition | null;
};

export type EditedImageResult = {
  frontImage: string;
  sideImage: string;
  backImage: string;
  frontImageId: string;
  sideImageId: string;
  backImageId: string;
};

export interface AiImageService {
  generateStyleCandidates(input: StyleGenerationInput): Promise<StyleCandidateSet[]>;
  interpretFeedback(input: FeedbackInput): Promise<FeedbackInterpretation>;
  editStyleImage(input: ImageEditInput): Promise<EditedImageResult>;
}
