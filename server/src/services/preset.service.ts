import { getDb } from '../db/database.js';
import { badRequest, notFound, pageMeta, parsePaging } from '../utils/http.js';
import * as repo from '../repositories/preset.repo.js';

const MAX_IMAGES = 5;
const MAX_IMAGE_CHARS = 10_000_000;

function assertPresetInput(input: repo.PresetInput, partial = false): void {
  if (!partial || input.name !== undefined) {
    if (!input.name?.trim()) throw badRequest('프리셋 이름을 입력해주세요.');
    if (input.name.trim().length > 30) throw badRequest('프리셋 이름은 30자 이내로 입력해주세요.');
  }
  if (input.desc !== undefined && input.desc.length > 60) throw badRequest('설명은 60자 이내로 입력해주세요.');
  if (input.memo !== undefined && input.memo.length > 300) throw badRequest('메모는 300자 이내로 입력해주세요.');
  for (const k of ['category', 'length', 'bang', 'perm', 'color'] as const) {
    if (input[k] !== undefined && input[k]!.length > 20) throw badRequest(`${k} 값이 너무 깁니다.`);
  }
  if (input.refImages !== undefined) {
    if (!Array.isArray(input.refImages)) throw badRequest('참고 사진 형식이 올바르지 않습니다.');
    if (input.refImages.length > MAX_IMAGES) throw badRequest(`참고 사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
    for (const src of input.refImages) {
      if (typeof src !== 'string' || src.length === 0) throw badRequest('참고 사진 형식이 올바르지 않습니다.');
      if (src.length > MAX_IMAGE_CHARS) throw badRequest('참고 사진 용량이 너무 큽니다.');
      if (!(src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://'))) {
        throw badRequest('참고 사진은 이미지 URL 또는 data-URL이어야 합니다.');
      }
    }
  }
}

export function listPresets(designerId: string, q: Record<string, unknown>) {
  const { page, limit } = parsePaging(q);
  const search = String(q.search ?? '').trim();
  const category = String(q.category ?? '').trim();
  const db = getDb();
  const total = repo.countPresets(designerId, search, category, db);
  const rows = repo.listPresets(designerId, { search, category, page, limit }, db);
  return { items: rows.map(repo.toPublicPreset), meta: pageMeta(page, limit, total) };
}

export function getPreset(designerId: string, id: string) {
  const row = repo.findPreset(designerId, id, getDb());
  if (!row) throw notFound('프리셋을 찾을 수 없습니다.');
  return repo.toPublicPreset(row);
}

export function createPreset(designerId: string, input: repo.PresetInput) {
  assertPresetInput(input);
  const row = repo.createPreset(designerId, { ...input, name: input.name.trim() }, getDb());
  return repo.toPublicPreset(row);
}

export function updatePreset(designerId: string, id: string, input: Partial<repo.PresetInput>) {
  assertPresetInput(input as repo.PresetInput, true);
  const patch = input.name !== undefined ? { ...input, name: input.name.trim() } : input;
  const row = repo.updatePreset(designerId, id, patch, getDb());
  if (!row) throw notFound('프리셋을 찾을 수 없습니다.');
  return repo.toPublicPreset(row);
}

export function deletePreset(designerId: string, id: string) {
  const ok = repo.softDeletePreset(designerId, id, getDb());
  if (!ok) throw notFound('프리셋을 찾을 수 없습니다.');
}
