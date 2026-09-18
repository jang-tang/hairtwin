import type { ConsultationReport } from '../types/consultation';
import type { HairPhotos, ImageRegion } from '../types/image';
import type { HairCondition } from '../types/consultation';
import type { StyleCandidateSet } from '../types/style';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `API 요청 실패 (${response.status})`);
  return body as T;
}

export async function uploadImage(file: Blob, fileName: string) {
  const form = new FormData();
  form.append('file', file, fileName);
  return request<{ id: string; url: string; source: 'upload' }>('/api/uploads', {
    method: 'POST',
    body: form,
  });
}

export async function generateCandidates(input: {
  hairPhotos: HairPhotos;
  intent: string;
  selectedStylePreset?: string;
  hairCondition: HairCondition;
  bangsLength: number;
  /** Deprecated: the backend intentionally generates one set only. */
  candidateCount?: number;
}) {
  return request<{ candidates: StyleCandidateSet[]; model: string }>('/api/ai/generate-candidates', {
    method: 'POST',
    body: JSON.stringify({
      frontId: input.hairPhotos.front?.id,
      sideId: input.hairPhotos.side?.id,
      backId: input.hairPhotos.back?.id,
      intent: input.intent,
      selectedStylePreset: input.selectedStylePreset,
      hairCondition: input.hairCondition,
      bangsLength: input.bangsLength,
      candidateCount: 1,
    }),
  });
}

export async function interpretFeedback(input: {
  feedbackText: string;
  selectedRegions: ImageRegion[];
  hairAttributes: HairCondition | null;
}) {
  return request<{ summary: string; adjustments: Array<{ label: string; amount?: number; detail?: string }> }>('/api/ai/interpret-feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function editStyle(input: {
  sourceImageIds: { front: string; side: string; back: string };
  feedbackText: string;
  selectedRegions: ImageRegion[];
  bangLength: number;
  hairAttributes: HairCondition | null;
}) {
  return request<{ frontImage: string; sideImage: string; backImage: string; frontImageId: string; sideImageId: string; backImageId: string }>('/api/ai/edit-style', {
    method: 'POST',
    body: JSON.stringify({
      frontId: input.sourceImageIds.front,
      sideId: input.sourceImageIds.side,
      backId: input.sourceImageIds.back,
      feedbackText: input.feedbackText,
      selectedRegions: input.selectedRegions,
      bangLength: input.bangLength,
      hairAttributes: input.hairAttributes,
    }),
  });
}

export async function saveReport(report: ConsultationReport) {
  return request<ConsultationReport>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}
