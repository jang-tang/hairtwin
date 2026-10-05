import { getImageProvider } from '../providers/image/index.js';
import { readPng, regionBounds } from '../providers/image/png.js';
import { VIEW_KEYS, type EditRequest, type GenerateInput, type GenerationResult, type EditResult, type ImageVersion } from '../providers/image/types.js';
import { badRequest, notFound, conflict } from '../utils/http.js';
import { newId, nowIso } from '../utils/ids.js';
import { getPreset } from './preset.service.js';
import * as repo from '../repositories/ai.repo.js';

const generating = new Map<string, Promise<GenerationResult>>();
const editing = new Map<string, Promise<EditResult>>();
const activeSessions = new Set<string>();
const builtinIds = new Set(['dandy','seethrough','part','regent','layered','hush','bob','wave']);
function publicSession(s: repo.AiSession): GenerationResult {
  const { input: _, ...result } = s;
  return result;
}
export function getSession(designerId: string, id: string): GenerationResult {
  const session = repo.findSession(designerId, id);
  if (!session) throw notFound('상담 이미지 세션을 찾을 수 없습니다.');
  return publicSession(session);
}
export async function generate(designerId: string, input: GenerateInput): Promise<GenerationResult> {
  const existing = repo.findByRequest(designerId, input.requestId);
  if (existing) return publicSession(existing);
  const key = designerId + ':' + input.requestId;
  if (generating.has(key)) return generating.get(key)!;
  const task = (async () => {
    for (const view of VIEW_KEYS) readPng(input.photos[view]);
    const resolved = { ...input };
    if (input.presetId && !builtinIds.has(input.presetId)) {
      resolved.preset = getPreset(designerId, input.presetId);
      // Raster reference images are normalized by the browser; canonical text comes from owned DB preset.
      resolved.preset = { ...resolved.preset, refImages: input.preset.refImages ?? [] };
    }
    for (const ref of resolved.preset.refImages ?? []) readPng(ref);
    const provider = getImageProvider(), out = await provider.generate(resolved);
    if (out.candidates.length !== 3) throw badRequest('후보 3개가 필요합니다.');
    for (const c of out.candidates) for (const view of VIEW_KEYS) readPng(c.views[view]);
    return publicSession(repo.createSession(designerId, resolved, out.candidates, provider.kind));
  })();
  generating.set(key, task);
  try { return await task; } finally { generating.delete(key); }
}
export async function edit(designerId: string, input: EditRequest): Promise<EditResult> {
  const session = repo.findSession(designerId, input.sessionId);
  if (!session) throw notFound('상담 이미지 세션을 찾을 수 없습니다.');
  const base = session.versions.find(v => v.id === input.baseVersionId);
  if (!base) throw notFound('기준 이미지 버전을 찾을 수 없습니다.');
  const provider = getImageProvider();
  // Never switch an existing session's provider silently.
  if (provider.kind !== session.provider) throw conflict('AI 모드가 변경됐습니다. 새 상담 후보를 생성해주세요.');
  const prior = repo.versionByRequest(input.sessionId, input.requestId);
  if (prior) return { version: prior, mock: prior.mock, provider: session.provider, summary: prior.summary };
  const key = input.sessionId + ':' + input.requestId;
  if (editing.has(key)) return editing.get(key)!;
  if (activeSessions.has(input.sessionId)) throw conflict('다른 편집이 진행 중입니다. 완료 후 다시 시도해주세요.');
  const source = readPng(base.views[input.view]);
  if (session.versions.length >= 50) throw badRequest('상담당 이미지 버전은 최대 50개입니다. 새 상담을 시작해주세요.');
  regionBounds(source.width, source.height, input.region);
  const candidate = session.candidates.find(c => c.id === base.candidateId)!;
  const task = (async () => {
    const out = await provider.edit({ ...input, views: base.views, original: session.input, candidate });
    for (const view of VIEW_KEYS) readPng(out.views[view]);
    const count = session.versions.filter(v => v.candidateId === base.candidateId).length;
    const version: ImageVersion = {
      id: newId('aiv'), candidateId: base.candidateId, label: 'V' + (count + 1), parentId: base.id,
      createdAt: nowIso(), views: out.views, summary: out.summary, mock: out.mock,
      settings: { bang: input.bang, sideLength: input.sideLength, sideHair: input.sideHair, condition: input.condition },
      feedback: input.feedback, freeText: input.freeText,
    };
    repo.saveVersion(input.sessionId, input.requestId, version);
    return { version, mock: out.mock, provider: provider.kind, summary: out.summary };
  })();
  editing.set(key, task); activeSessions.add(input.sessionId);
  try { return await task; } finally { editing.delete(key); activeSessions.delete(input.sessionId); }
}
