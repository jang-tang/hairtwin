import { config } from '../../config.js';
import { MockImageProvider } from './mock.provider.js';
import { RealImageProvider } from './real.provider.js';
import type { ImageProvider } from './types.js';

let cached: ImageProvider | null = null;

/** AI_PROVIDER=real + OPENAI_API_KEY가 있을 때만 real, 그 외는 mock */
export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  if (config.aiProvider === 'real' && config.openaiApiKey) {
    cached = new RealImageProvider();
  } else {
    cached = new MockImageProvider();
  }
  return cached;
}

export function imageProviderKind(): 'mock' | 'real' {
  return getImageProvider().kind;
}
