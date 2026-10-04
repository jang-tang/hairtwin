import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database.js';
import { newId, nowIso } from '../utils/ids.js';

export interface CustomerRow {
  id: string;
  designer_id: string;
  name: string;
  phone: string | null;
  last_visit: string | null;
  history_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PublicCustomer {
  id: string;
  name: string;
  phone?: string;
  lastVisit?: string;
  historyCount: number;
}

export function toPublicCustomer(r: CustomerRow): PublicCustomer {
  return {
    id: r.id,
    name: r.name,
    ...(r.phone ? { phone: r.phone } : {}),
    ...(r.last_visit ? { lastVisit: r.last_visit } : {}),
    historyCount: r.history_count,
  };
}

export function countCustomers(designerId: string, search: string, db: DatabaseSync = getDb()): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM customers WHERE designer_id = ? AND deleted_at IS NULL ${search ? 'AND name LIKE ?' : ''}`
    )
    .get(designerId, ...(search ? [`%${search}%`] : [])) as { c: number };
  return row.c;
}

export function listCustomers(
  designerId: string,
  opts: { search: string; page: number; limit: number; sort: 'recent' | 'name' },
  db: DatabaseSync = getDb()
): CustomerRow[] {
  const { search, page, limit, sort } = opts;
  const order = sort === 'name' ? 'name ASC' : 'updated_at DESC';
  return db
    .prepare(
      `SELECT * FROM customers WHERE designer_id = ? AND deleted_at IS NULL ${search ? 'AND name LIKE ?' : ''} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(designerId, ...(search ? [`%${search}%`] : []), limit, (page - 1) * limit) as unknown as CustomerRow[];
}

export function findCustomer(designerId: string, id: string, db: DatabaseSync = getDb()): CustomerRow | null {
  return (
    (db.prepare('SELECT * FROM customers WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').get(id, designerId) as
      | CustomerRow
      | undefined) ?? null
  );
}

export function findCustomerByName(designerId: string, name: string, db: DatabaseSync = getDb()): CustomerRow | null {
  return (
    (db
      .prepare('SELECT * FROM customers WHERE designer_id = ? AND name = ? AND deleted_at IS NULL')
      .get(designerId, name) as CustomerRow | undefined) ?? null
  );
}

export function createCustomer(
  designerId: string,
  input: { name: string; phone?: string; lastVisit?: string },
  db: DatabaseSync = getDb()
): CustomerRow {
  const now = nowIso();
  const row: CustomerRow = {
    id: newId('c'),
    designer_id: designerId,
    name: input.name,
    phone: input.phone ?? null,
    last_visit: input.lastVisit ?? null,
    history_count: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  db.prepare(
    'INSERT INTO customers (id, designer_id, name, phone, last_visit, history_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(row.id, row.designer_id, row.name, row.phone, row.last_visit, row.history_count, row.created_at, row.updated_at);
  return row;
}

export function updateCustomer(
  designerId: string,
  id: string,
  input: { name?: string; phone?: string | null; lastVisit?: string | null },
  db: DatabaseSync = getDb()
): CustomerRow | null {
  const cur = findCustomer(designerId, id, db);
  if (!cur) return null;
  const next = {
    name: input.name ?? cur.name,
    phone: input.phone !== undefined ? input.phone : cur.phone,
    last_visit: input.lastVisit !== undefined ? input.lastVisit : cur.last_visit,
  };
  db.prepare('UPDATE customers SET name = ?, phone = ?, last_visit = ?, updated_at = ? WHERE id = ?').run(
    next.name,
    next.phone,
    next.last_visit,
    nowIso(),
    id
  );
  return findCustomer(designerId, id, db);
}

/** 상담 완료 시 호출: history_count+1, last_visit 갱신 */
export function bumpCustomerStats(designerId: string, id: string, date: string, db: DatabaseSync): void {
  db.prepare('UPDATE customers SET history_count = history_count + 1, last_visit = ?, updated_at = ? WHERE id = ? AND designer_id = ?').run(
    date,
    nowIso(),
    id,
    designerId
  );
}

export function softDeleteCustomer(designerId: string, id: string, db: DatabaseSync = getDb()): boolean {
  const r = db.prepare('UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ? AND designer_id = ? AND deleted_at IS NULL').run(nowIso(), nowIso(), id, designerId);
  return Number((r as unknown as { changes: number }).changes ?? 0) > 0;
}
