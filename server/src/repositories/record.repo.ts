import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database.js';
import { newId, nowIso, toJson, fromJson } from '../utils/ids.js';
import { bumpCustomerStats } from './customer.repo.js';

export interface HairCondition {
  damage: string;
  texture: string;
  thickness: string;
  density: string;
  elasticity: string;
  feel: string;
}

export interface RecordRow {
  id: string;
  designer_id: string;
  customer_id: string | null;
  customer_name: string;
  date: string;
  style_name: string;
  views: string;
  intent: string;
  adjustments: string;
  condition_json: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PublicRecord {
  id: string;
  customerId?: string;
  customerName: string;
  date: string;
  styleName: string;
  views: { front: string; side: string; back: string };
  intent: string;
  adjustments: string[];
  condition: HairCondition | null;
}

export function toPublicRecord(r: RecordRow): PublicRecord {
  return {
    id: r.id,
    ...(r.customer_id ? { customerId: r.customer_id } : {}),
    customerName: r.customer_name,
    date: r.date,
    styleName: r.style_name,
    views: fromJson(r.views, { front: '', side: '', back: '' }),
    intent: r.intent,
    adjustments: fromJson<string[]>(r.adjustments, []),
    condition: fromJson<HairCondition | null>(r.condition_json, null),
  };
}

export interface RecordInput {
  customerId?: string;
  customerName: string;
  date?: string;
  styleName?: string;
  views: { front: string; side: string; back: string };
  intent?: string;
  adjustments?: string[];
  condition?: HairCondition | null;
}

export function countRecords(designerId: string, opts: { search: string; customerId: string }, db: DatabaseSync = getDb()): number {
  const conds: string[] = [];
  const args: unknown[] = [designerId];
  if (opts.search) {
    conds.push('(customer_name LIKE ? OR style_name LIKE ?)');
    args.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  if (opts.customerId) {
    conds.push('customer_id = ?');
    args.push(opts.customerId);
  }
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM consultation_records WHERE designer_id = ? AND deleted_at IS NULL ${conds.length ? 'AND ' + conds.join(' AND ') : ''}`
    )
    .get(...(args as never[])) as { c: number };
  return row.c;
}

export function listRecords(
  designerId: string,
  opts: { search: string; customerId: string; page: number; limit: number },
  db: DatabaseSync = getDb()
): RecordRow[] {
  const conds: string[] = [];
  const args: unknown[] = [designerId];
  if (opts.search) {
    conds.push('(customer_name LIKE ? OR style_name LIKE ?)');
    args.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  if (opts.customerId) {
    conds.push('customer_id = ?');
    args.push(opts.customerId);
  }
  return db
    .prepare(
      `SELECT * FROM consultation_records WHERE designer_id = ? AND deleted_at IS NULL ${conds.length ? 'AND ' + conds.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...(args as never[]), opts.limit, (opts.page - 1) * opts.limit) as unknown as RecordRow[];
}

export function findRecord(designerId: string, id: string, db: DatabaseSync = getDb()): RecordRow | null {
  return (
    (db.prepare('SELECT * FROM consultation_records WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').get(id, designerId) as
      | RecordRow
      | undefined) ?? null
  );
}

/**
 * 상담 완료 트랜잭션: 기록 저장 + 고객 통계 갱신(있으면) 을 원자적으로 수행.
 * customerId가 없으면 customerName으로 기존 고객을 찾아 연결 시도.
 */
export function createRecordTx(
  designerId: string,
  input: RecordInput,
  db: DatabaseSync,
  resolveCustomerId?: (designerId: string, name: string, db: DatabaseSync) => string | null
): RecordRow {
  const now = nowIso();
  const id = newId('r');
  let customerId: string | null = input.customerId ?? null;
  if (!customerId && resolveCustomerId) {
    customerId = resolveCustomerId(designerId, input.customerName, db);
  }
  const date = input.date ?? now.slice(0, 10);
  db.prepare(
    `INSERT INTO consultation_records (id, designer_id, customer_id, customer_name, date, style_name, views, intent, adjustments, condition_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    designerId,
    customerId,
    input.customerName,
    date,
    input.styleName ?? '',
    toJson(input.views),
    input.intent ?? '',
    toJson(input.adjustments ?? []),
    input.condition ? toJson(input.condition) : null,
    now,
    now
  );
  if (customerId) bumpCustomerStats(designerId, customerId, date, db);
  return db.prepare('SELECT * FROM consultation_records WHERE id = ?').get(id) as unknown as RecordRow;
}

export function softDeleteRecord(designerId: string, id: string, db: DatabaseSync = getDb()): boolean {
  const r = db.prepare('UPDATE consultation_records SET deleted_at = ?, updated_at = ? WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').run(nowIso(), nowIso(), id, designerId);
  return Number((r as unknown as { changes: number }).changes ?? 0) > 0;
}
