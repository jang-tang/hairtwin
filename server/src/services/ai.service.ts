import { getImageProvider } from '../providers/image/index.js';
import { badRequest } from '../utils/http.js';
import type { EditInput, GenerateInput } from '../providers/image/types.js';

export async function generate(input: GenerateInput) {
  const provider = getImageProvider();
  return provider.generate(input);
}

export async function edit(input: EditInput) {
  if (!input.image) throw badRequest('기준 이미지가 필요합니다.');
  if (typeof input.bang !== 'number' || input.bang < 0 || input.bang > 100) {
    throw badRequest('앞머리 값은 0~100이어야 합니다.');
  }
  if (input.sideLength !== undefined && (typeof input.sideLength !== 'number' || input.sideLength < 0 || input.sideLength > 100)) {
    throw badRequest('옆머리 값은 0~100이어야 합니다.');
  }
  if (input.region) {
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      const v = (input.region as unknown as Record<string, unknown>)[k];
      if (typeof v !== 'number' || v < 0 || v > 1) throw badRequest('영역 좌표는 0~1이어야 합니다.');
    }
  }
  const provider = getImageProvider();
  return provider.edit(input);
}
