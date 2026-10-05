import { config } from '../../config.js';
import { AppError } from '../../utils/http.js';
import { causeDiagnostic, diagnosticIdentifier, type ErrorDiagnostics } from '../../utils/errorLog.js';
import { createMask, preserveOutside, readPng } from './png.js';
import { DIRECTIONS, generationPrompt, editPrompt, editSummary, settingsText } from './prompts.js';
import { VIEW_KEYS, type EditInput, type GenerateInput, type ImageProvider, type TriView } from './types.js';

type ImageCall = Pick<NonNullable<ErrorDiagnostics['ai']>, 'operation' | 'phase' | 'candidateId' | 'view'>;

export class RealImageProvider implements ImageProvider {
  readonly kind = 'real' as const;
  constructor(private transport: typeof fetch = fetch, private key = config.openaiApiKey) {}

  private async image(prompt: string, images: string[], context: ImageCall, mask?: Buffer): Promise<string> {
    const fail = (reason: NonNullable<ErrorDiagnostics['ai']>['reason'], message: string,
      extra: Partial<NonNullable<ErrorDiagnostics['ai']>> = {}, cause?: unknown) =>
      new AppError(reason === 'not_configured' ? 503 : 502, reason === 'not_configured' ? 'AI_NOT_CONFIGURED' : 'EXTERNAL_API_ERROR', message,
        undefined, { ai: { ...context, model: config.imageModel, reason, ...extra }, ...(cause ? { cause: causeDiagnostic(cause) } : {}) });
    if (!this.key) throw fail('not_configured', '실제 AI를 사용하려면 서버 API 키를 설정해주세요.');
    const form = new FormData();
    form.set('model', config.imageModel);
    form.set('prompt', prompt); form.set('size', '1024x1024'); form.set('n', '1');
    form.set('output_format', 'png'); form.set('quality', 'medium');
    if (['gpt-image-1', 'gpt-image-1.5'].includes(config.imageModel)) form.set('input_fidelity', 'high');
    images.forEach((src, i) => {
      readPng(src);
      const bytes = Buffer.from(src.split(',')[1], 'base64');
      form.append('image[]', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'reference-' + i + '.png');
    });
    if (mask) form.set('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png');
    let response: Response;
    try {
      response = await this.transport('https://api.openai.com/v1/images/edits', {
        method: 'POST', headers: { Authorization: 'Bearer ' + this.key }, body: form,
        signal: AbortSignal.timeout(180_000),
      });
    } catch (error) {
      const timeout = ['TimeoutError', 'AbortError'].includes((error as Error)?.name);
      throw fail(timeout ? 'timeout' : 'network', timeout ? '이미지 생성 시간이 초과됐습니다. 다시 시도해주세요.' : '이미지 서버에 연결하지 못했습니다. 다시 시도해주세요.', {}, error);
    }
    const upstreamRequestId = diagnosticIdentifier(response.headers.get('x-request-id'));
    if (!response.ok) {
      let upstreamCode: string | undefined, upstreamType: string | undefined;
      try {
        const result = await response.json() as { error?: { code?: unknown; type?: unknown } };
        upstreamCode = diagnosticIdentifier(result?.error?.code); upstreamType = diagnosticIdentifier(result?.error?.type);
      } catch { /* Non-JSON failures still retain status and request ID. */ }
      const reason = upstreamCode === 'insufficient_quota' || upstreamCode === 'billing_hard_limit_reached' ? 'AI 사용 한도 또는 결제 설정을 확인해주세요.'
        : response.status === 429 ? 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        : response.status === 401 ? 'AI 서버 인증에 실패했습니다. 서버 키 설정을 확인해주세요.'
        : response.status === 403 ? 'AI 모델 접근 권한을 확인해주세요.'
        : upstreamCode === 'content_policy_violation' || upstreamCode === 'moderation_blocked' ? '이미지 요청이 AI 정책 검사에서 거절됐습니다.'
        : '이미지 처리에 실패했습니다.';
      throw fail('upstream', reason + ' (' + response.status + ')', { upstreamStatus: response.status, upstreamRequestId, upstreamCode, upstreamType });
    }
    let src: string;
    try {
      const result = await response.json() as { data?: { b64_json?: string }[] };
      if (!result.data?.[0]?.b64_json) throw new Error('empty');
      src = 'data:image/png;base64,' + result.data[0].b64_json;
      readPng(src);
    } catch (error) { throw fail('invalid_output', '이미지 서버가 올바른 PNG 결과를 반환하지 않았습니다.', { upstreamStatus: response.status, upstreamRequestId }, error); }
    return src;
  }

  async generate(input: GenerateInput) {
    const candidates = [];
    // Three distinct prompts, with an anchor shared only within each candidate.
    for (const direction of DIRECTIONS) {
      const refs = (input.preset.refImages ?? []).slice(0, 2);
      const front = await this.image(generationPrompt(input, direction, 'front', false), [input.photos.front, input.photos.side, input.photos.back, ...refs],
        { operation: 'generate', phase: 'anchor', candidateId: direction.id, view: 'front' });
      const views: TriView = { front, side: '', back: '' };
      for (const view of ['side', 'back'] as const) {
        views[view] = await this.image(generationPrompt(input, direction, view, true), [input.photos[view], front, ...refs],
          { operation: 'generate', phase: 'propagate', candidateId: direction.id, view });
      }
      candidates.push({ id: direction.id, name: direction.name, desc: direction.desc, views });
    }
    return { candidates, mock: false };
  }

  async edit(input: EditInput) {
    const source = input.views[input.view], other = VIEW_KEYS.filter(v => v !== input.view);
    const result = await this.image(editPrompt(input), [source, ...other.map(v => input.views[v])],
      { operation: 'edit', phase: 'anchor', candidateId: input.candidate.id, view: input.view }, createMask(source, input.region));
    const anchor = preserveOutside(source, result, input.region);
    const views = { ...input.views, [input.view]: anchor };
    for (const view of other) {
      views[view] = await this.image([
        'Image 1 is the existing ' + view + ' view. Image 2 is the just-edited ' + input.view + ' anchor. Image 3 is the original customer in this view.',
        'Update ONLY the hairstyle to match the anchor, preserving identity, pose, clothing, lighting and background. Do not change viewpoint.',
        'Adjustments: ' + editSummary(input) + '. Hair constraints: ' + settingsText(input),
        'Output one ' + view + ' view in 1024x1024 PNG, no text or collage.',
      ].join('\n'), [input.views[view], anchor, input.original.photos[view]],
        { operation: 'edit', phase: 'propagate', candidateId: input.candidate.id, view });
    }
    return { views, mock: false, summary: editSummary(input) };
  }
}
