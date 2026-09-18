export type ImageSource = {
  id: string;
  url: string;
  source: 'upload' | 'camera' | 'generated';
};

export type HairPhotos = {
  front: ImageSource | null;
  side: ImageSource | null;
  back: ImageSource | null;
};

export type ImageRegionType = 'fringe' | 'side' | 'crown' | 'back' | 'all';

export type ImageRegion = {
  id: string;
  type: ImageRegionType;
  x: number;
  y: number;
  width: number;
  height: number;
  view?: 'front' | 'side' | 'back';
};
