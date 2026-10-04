import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database.js';
import { newId, nowIso, toJson, fromJson } from '../utils/ids.js';

export interface TriView {
  front: string;
  side: string;
  back: string;
}

export interface PresetRow {
  id: string;
  designer_id: string;
  name: string;
  description: string;
  category: string;
  length: string;
  bang: string;
  perm: string;
  color: string;
  memo: string;
  ref_images: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PublicPreset {
  id: string;
  name: string;
  desc: string;
  category: string;
  length: string;
  bang: string;
  perm: string;
  color: string;
  memo: string;
  refImages: string[];
  createdAt: string;
  updatedAt: string;
}

export function toPublicPreset(r: PresetRow): PublicPreset {
  return {
    id: r.id,
    name: r.name,
    desc: r.description,
    category: r.category,
    length: r.length,
    bang: r.bang,
    perm: r.perm,
    color: r.color,
    memo: r.memo,
    refImages: fromJson<string[]>(r.ref_images, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface PresetInput {
  name: string;
  desc?: string;
  category?: string;
  length?: string;
  bang?: string;
  perm?: string;
  color?: string;
  memo?: string;
  refImages?: string[];
}

export function countPresets(designerId: string, search: string, category: string, db: DatabaseSync = getDb()): number {
  const conds: string[] = [];
  const args: unknown[] = [designerId];
  if (search) {
    conds.push('(name LIKE ? OR description LIKE ?)');
    args.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    conds.push('category = ?');
    args.push(category);
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM presets WHERE designer_id = ? AND deleted_at IS NULL ${conds.length ? 'AND ' + conds.join(' AND ') : ''}`)
    .get(...(args as never[])) as { c: number };
  return row.c;
}

export function listPresets(
  designerId: string,
  opts: { search: string; category: string; page: number; limit: number },
  db: DatabaseSync = getDb()
): PresetRow[] {
  const conds: string[] = [];
  const args: unknown[] = [designerId];
  if (opts.search) {
    conds.push('(name LIKE ? OR description LIKE ?)');
    args.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  if (opts.category) {
    conds.push('category = ?');
    args.push(opts.category);
  }
  return db
    .prepare(
      `SELECT * FROM presets WHERE designer_id = ? AND deleted_at IS NULL ${conds.length ? 'AND ' + conds.join(' AND ') : ''} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    )
    .all(...(args as never[]), opts.limit, (opts.page - 1) * opts.limit) as unknown as PresetRow[];
}

export function findPreset(designerId: string, id: string, db: DatabaseSync = getDb()): PresetRow | null {
  return (
    (db.prepare('SELECT * FROM presets WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').get(id, designerId) as
      | PresetRow
      | undefined) ?? null
  );
}

export function createPreset(designerId: string, input: PresetInput, db: DatabaseSync = getDb()): PresetRow {
  const now = nowIso();
  const id = newId('sp');
  db.prepare(
    `INSERT INTO presets (id, designer_id, name, description, category, length, bang, perm, color, memo, ref_images, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    designerId,
    input.name,
    input.desc ?? '',
    input.category ?? '',
    input.length ?? '',
    input.bang ?? '',
    input.perm ?? '',
    input.color ?? '',
    input.memo ?? '',
    toJson(input.refImages ?? []),
    now,
    now
  );
  return findPreset(designerId, id, db)!;
}

export function updatePreset(designerId: string, id: string, input: Partial<PresetInput>, db: DatabaseSync = getDb()): PresetRow | null {
  const cur = findPreset(designerId, id, db);
  if (!cur) return null;
  db.prepare(
    `UPDATE presets SET name = ?, description = ?, category = ?, length = ?, bang = ?, perm = ?, color = ?, memo = ?, ref_images = ?, updated_at = ? WHERE id = ?`
  ).run(
    input.name ?? cur.name,
    input.desc ?? cur.description,
    input.category ?? cur.category,
    input.length ?? cur.length,
    input.bang ?? cur.bang,
    input.perm ?? cur.perm,
    input.color ?? cur.color,
    input.memo ?? cur.memo,
    toJson(input.refImages ?? fromJson<string[]>(cur.ref_images, [])),
    nowIso(),
    id
  );
  return findPreset(designerId, id, db);
}

export function softDeletePreset(designerId: string, id: string, db: DatabaseSync = getDb()): boolean {
  const r = db.prepare('UPDATE presets SET deleted_at = ?, updated_at = ? WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').run(nowIso(), nowIso(), id, designerId);
  return Number((r as unknown as { changes: number }).changes ?? 0) > 0;
}
