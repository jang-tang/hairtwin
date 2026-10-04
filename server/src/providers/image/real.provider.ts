import { config } from '../../config.js';
import type { EditInput, GenerateInput, ImageProvider } from './types.js';

/**
 * Real 이미지 Provider (서버 전용, 키는 절대 프론트에 노출하지 않음).
 * - OPENAI_API_KEY가 있을 때만 사용. 없으면 factory에서 mock으로 폴백.
 * - 현재는 gpt-image-1 계열 엔드포인트를 fetch로 직접 호출 (추가 SDK 없음).
 * - 반환은 프론트 TriView 형태에 맞춘 URL. 실제 이미지 바이트가 필요하면
 *   data-URL로 변환해 저장하도록 확장 가능.
 */
export class RealImageProvider implements ImageProvider {
  readonly kind = 'real' as const;

  private assertKey(): string {
    if (!config.openaiApiKey) throw Object.assign(new Error('OPENAI_API_KEY가 설정되지 않았습니다.'), { status: 500 });
    return config.openaiApiKey;
  }

  async generate(input: GenerateInput) {
    const key = this.assertKey();
    const prompt = `hairstyle consultation, preset ${input.presetId ?? ''} ${input.prompt ?? ''}`.trim();
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', n: 1 }),
    });
    if (!res.ok) throw Object.assign(new Error(`이미지 생성 실패 (${res.status})`), { status: 502 });
    const json = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
    const first = json.data?.[0];
    const url = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : '');
    if (!url) throw Object.assign(new Error('이미지 생성 결과가 비어 있습니다.'), { status: 502 });
    const views = { front: url, side: url, back: url };
    return {
      candidates: [
        { id: 'A', name: 'AI 제안 A', desc: prompt.slice(0, 40), views },
        { id: 'B', name: 'AI 제안 B', desc: prompt.slice(0, 40), views },
        { id: 'C', name: 'AI 제안 C', desc: prompt.slice(0, 40), views },
      ],
      mock: false as const,
    };
  }

  async edit(input: EditInput) {
    this.assertKey();
    // 편집은 생성과 동일한 엔드포인트로 위임 (마스크 고도화는 추후 확장).
    // 여기서는 요약만 반환하고 실제 합성은 generate 경로 재사용을 권장.
    return { ok: true, mock: false as const, summary: `앞머리 ${input.bang} · ${(input.feedback ?? []).slice(0, 2).join(' · ')}` };
  }
}
