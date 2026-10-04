import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/database.js';
import { newId, nowIso } from '../utils/ids.js';

export interface DesignerRow {
  id: string;
  name: string;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicDesigner {
  id: string;
  name: string;
  createdAt: string;
}

export function toPublicDesigner(r: DesignerRow): PublicDesigner {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

export function findDesignerByName(name: string, db: DatabaseSync = getDb()): DesignerRow | null {
  return (db.prepare('SELECT * FROM designers WHERE name = ?').get(name) as DesignerRow | undefined) ?? null;
}

export function findDesignerById(id: string, db: DatabaseSync = getDb()): DesignerRow | null {
  return (db.prepare('SELECT * FROM designers WHERE id = ?').get(id) as DesignerRow | undefined) ?? null;
}

export function createDesigner(name: string, passwordHash: string | null, db: DatabaseSync = getDb()): DesignerRow {
  const row: DesignerRow = { id: newId('dsg'), name, password_hash: passwordHash, created_at: nowIso(), updated_at: nowIso() };
  db.prepare('INSERT INTO designers (id, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    row.id,
    row.name,
    row.password_hash,
    row.created_at,
    row.updated_at
  );
  return row;
}
