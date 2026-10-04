import type { EditInput, GenerateInput, GeneratedCandidate, ImageProvider } from './types.js';

const PICSUM = (seed: string, n = 600) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${n}/${Math.round(n * 1.15)}`;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Mock 이미지 Provider.
 * - 실제 키 없이 전체 상담 흐름(생성→후보→수정→비교)을 끝까지 테스트 가능.
 * - 결정적(deterministic): 같은 입력이면 같은 URL.
 * - 에러 시뮬레이션: prompt에 '__fail__' 포함 시 외부 API 오류처럼 throw.
 */
export class MockImageProvider implements ImageProvider {
  readonly kind = 'mock' as const;

  async generate(input: GenerateInput): Promise<{ candidates: GeneratedCandidate[]; mock: boolean }> {
    const p = `${input.presetId ?? ''}:${input.prompt ?? ''}`;
    if (p.includes('__fail__')) {
      await delay(300);
      const err = new Error('외부 이미지 API 오류 (mock 시뮬레이션)') as Error & { status?: number };
      err.status = 502;
      throw err;
    }
    await delay(500);
    const base = `mock-${hashSeed(p || 'hair') % 997}`;
    const defs = [
      { id: 'A', name: '내추럴 시스루', desc: '가볍고 자연스러운 앞머리' },
      { id: 'B', name: '소프트 레이어드', desc: '옆선이 부드럽게 떨어짐' },
      { id: 'C', name: '볼륨 보브', desc: '단정하고 세련된 라인' },
    ];
    const candidates: GeneratedCandidate[] = defs.map((d) => ({
      ...d,
      views: { front: PICSUM(`${base}${d.id}f`), side: PICSUM(`${base}${d.id}s`), back: PICSUM(`${base}${d.id}b`) },
    }));
    return { candidates, mock: true };
  }

  async edit(input: EditInput): Promise<{ ok: boolean; mock: boolean; summary: string }> {
    if (typeof input.image === 'string' && input.image.includes('__fail__')) {
      await delay(300);
      const err = new Error('외부 이미지 편집 API 오류 (mock 시뮬레이션)') as Error & { status?: number };
      err.status = 502;
      throw err;
    }
    await delay(500);
    const parts = [
      input.region ? `${input.region.type} 영역` : '전체',
      `앞머리 ${input.bang}`,
      typeof input.sideLength === 'number' ? `옆머리 ${input.sideLength}` : null,
      ...(input.feedback ?? []).slice(0, 2),
    ].filter(Boolean);
    return { ok: true, mock: true, summary: parts.join(' · ') };
  }
}
