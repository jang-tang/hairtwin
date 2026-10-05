import { config } from '../../config.js';
import { MockImageProvider } from './mock.provider.js';
import { RealImageProvider } from './real.provider.js';
import type { ImageProvider } from './types.js';
import { AppError } from '../../utils/http.js';

let cached: ImageProvider | null = null;

/** An explicit real mode requires a key; errors never become mock results. */
export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  if (config.aiProvider === 'real') {
    if (!config.openaiApiKey) throw new AppError(503, 'AI_NOT_CONFIGURED', '실제 AI를 사용하려면 서버 API 키를 설정해주세요.');
    cached = new RealImageProvider();
  } else {
    cached = new MockImageProvider();
  }
  return cached;
}

export function imageProviderKind(): 'mock' | 'real' {
  return getImageProvider().kind;
}
