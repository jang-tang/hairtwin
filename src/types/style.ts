export type StyleCategory = 'cut' | 'perm' | 'color' | 'style';
export type StyleTarget = 'male' | 'female' | 'unisex';

export type StylePreset = {
  id: string;
  salonId: string;
  name: string;
  description: string;
  category: StyleCategory;
  target: StyleTarget;
  tags: string[];
  referenceImages: string[];
  aiInstruction: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StyleCandidateSet = {
  id: string;
  title: string;
  description: string;
  frontImage: string;
  sideImage: string;
  backImage: string;
  frontImageId?: string;
  sideImageId?: string;
  backImageId?: string;
  tags: string[];
};

export type FinalStyle = {
  presetId?: string;
  name: string;
  description?: string;
  frontImage?: string;
  sideImage?: string;
  backImage?: string;
  frontImageId?: string;
  sideImageId?: string;
  backImageId?: string;
  bangLength?: number;
  sideHairVolume?: 'natural' | 'down';
  curlStrength?: 'light' | 'medium' | 'strong';
};
