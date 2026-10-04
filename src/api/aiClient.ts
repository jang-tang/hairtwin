// AI abstraction: React -> Server -> GPT Image (§67-69)
// API key는 브라우저에 노출하지 않습니다 (VITE_AI_PROXY_URL 경유).
// VITE_MOCK_AI=false 로 설정하기 전까지는 목업으로 동작해 전체 흐름을 체험할 수 있습니다.
import type { Region } from '../types';
import { isMockMode } from '../mocks/mockImages';

export { isMockMode };

export interface EditPayload {
  image: string; region: Region | null; bang: number;
  condition: unknown; sideHair: string; feedback: string[];
}
export async function requestGeneration(prompt: string): Promise<{ ok: boolean; mock: boolean }> {
  void prompt;
  if (isMockMode()) {
    // 목업: 서버 없이 0.9초 시뮬레이션
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true, mock: true };
  }
  const proxy = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  if (!proxy) throw new Error('VITE_AI_PROXY_URL이 설정되지 않았습니다.');
  const res = await fetch(`${proxy}/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maskHint: 'full' })
  });
  if (!res.ok) throw new Error(`생성 서버 오류 (${res.status})`);
  return { ok: true, mock: false };
}
export async function requestEdit(payload: EditPayload): Promise<{ ok: boolean; mock: boolean }> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true, mock: true };
  }
  const proxy = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  if (!proxy) throw new Error('VITE_AI_PROXY_URL이 설정되지 않았습니다.');
  const res = await fetch(`${proxy}/edit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maskHint: regionToMaskHint(payload.region) })
  });
  if (!res.ok) throw new Error(`편집 서버 오류 (${res.status})`);
  return { ok: true, mock: false };
}
export function regionToMaskHint(r: Region | null): string {
  if (!r) return 'full';
  return `${r.type}:${r.x.toFixed(2)},${r.y.toFixed(2)},${r.w.toFixed(2)},${r.h.toFixed(2)}`;
}
