// AI abstraction: React -> Express Server -> Image Provider (§10-11)
// - 서버가 있으면 POST /api/ai/generate, /api/ai/edit 호출 (키는 서버 env에만 존재)
// - 서버 연결 실패/미로그인 시 기존 로컬 목업으로 폴백 (VITE_MOCK_AI=true 기본)
// - VITE_MOCK_AI=false + VITE_AI_PROXY_URL: 레거시 직접 프록시 경로 (하위 호환)
import type { Candidate, Region } from '../types';
import { isMockMode } from '../mocks/mockImages';
import { api, getToken, isOnlineError } from './server';

export { isMockMode };

export interface EditPayload {
  image: string;
  region: Region | null;
  bang: number;
  sideLength?: number;
  condition: unknown;
  sideHair: string;
  feedback: string[];
}

export interface GenerationResult {
  ok: boolean;
  mock: boolean;
  candidates?: Candidate[];
}

export async function requestGeneration(prompt: string): Promise<GenerationResult> {
  if (getToken()) {
    try {
      const out = await api.ai.generate({ prompt });
      return { ok: true, mock: out.mock, candidates: out.candidates };
    } catch (e) {
      if (!isOnlineError(e) && (e as { status?: number }).status !== 401) throw e;
      // 오프라인/미인증 → 아래 로컬 경로로 폴백
    }
  }
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true, mock: true };
  }
  const proxy = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  if (!proxy) throw new Error('VITE_AI_PROXY_URL이 설정되지 않았습니다.');
  const res = await fetch(`${proxy}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maskHint: 'full' }),
  });
  if (!res.ok) throw new Error(`생성 서버 오류 (${res.status})`);
  return { ok: true, mock: false };
}

export async function requestEdit(payload: EditPayload): Promise<{ ok: boolean; mock: boolean; summary?: string }> {
  if (getToken()) {
    try {
      const out = await api.ai.edit({ ...payload });
      return { ok: true, mock: out.mock, summary: out.summary };
    } catch (e) {
      if (!isOnlineError(e) && (e as { status?: number }).status !== 401) throw e;
    }
  }
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true, mock: true };
  }
  const proxy = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  if (!proxy) throw new Error('VITE_AI_PROXY_URL이 설정되지 않았습니다.');
  const res = await fetch(`${proxy}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maskHint: regionToMaskHint(payload.region) }),
  });
  if (!res.ok) throw new Error(`편집 서버 오류 (${res.status})`);
  return { ok: true, mock: false };
}

export function regionToMaskHint(r: Region | null): string {
  if (!r) return 'full';
  return `${r.type}:${r.x.toFixed(2)},${r.y.toFixed(2)},${r.w.toFixed(2)},${r.h.toFixed(2)}`;
}
