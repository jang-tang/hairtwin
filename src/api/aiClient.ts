import { api, getToken } from './server';
import type { GenerateInput, GenerationResult, EditRequest } from '../../server/src/providers/image/types';

export { isMockMode } from '../mocks/mockImages';
const pending = new Map<string, Promise<GenerationResult>>();
export async function requestGeneration(input: GenerateInput): Promise<GenerationResult> {
  if (!getToken()) throw new Error('서버에 로그인한 뒤 후보를 생성해주세요.');
  const key = getToken() + ':' + input.requestId;
  if (pending.has(key)) return pending.get(key)!;
  const promise = api.ai.generate(input);
  pending.set(key, promise);
  try { return await promise; } finally { pending.delete(key); }
}
export async function requestEdit(input: EditRequest) {
  if (!getToken()) throw new Error('서버에 로그인한 뒤 이미지를 편집해주세요.');
  return api.ai.edit(input);
}
