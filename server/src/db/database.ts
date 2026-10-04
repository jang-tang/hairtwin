import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * SQLite 연결 + 버전형 마이그레이션 러너.
 * - 파일 DB (기본 ./data/hairtwin.sqlite). :memory: 지원.
 * - _migrations 테이블로 적용 여부 추적, 재실행 시 멱등.
 */

const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: 'init',
    sql: `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS designers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_designers_name ON designers(name);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      last_visit TEXT,
      history_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_designer ON customers(designer_id);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(designer_id, name);

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      length TEXT NOT NULL DEFAULT '',
      bang TEXT NOT NULL DEFAULT '',
      perm TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      memo TEXT NOT NULL DEFAULT '',
      ref_images TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_presets_designer ON presets(designer_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_presets_category ON presets(designer_id, category);

    CREATE TABLE IF NOT EXISTS consultation_records (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      style_name TEXT NOT NULL DEFAULT '',
      views TEXT NOT NULL DEFAULT '{}',
      intent TEXT NOT NULL DEFAULT '',
      adjustments TEXT NOT NULL DEFAULT '[]',
      condition_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_designer ON consultation_records(designer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_customer ON consultation_records(customer_id, created_at DESC);
    `,
  },
];

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (config.dbPath !== ':memory:') {
    const dir = path.dirname(config.dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

/** 트랜잭션 헬퍼: fn이 throw하면 롤백 */
export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const d = getDb();
  // node:sqlite는 exec 기반 트랜잭션 사용
  d.exec('BEGIN IMMEDIATE');
  try {
    const out = fn(d);
    d.exec('COMMIT');
    return out;
  } catch (e) {
    try {
      d.exec('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  }
}

function migrate(d: DatabaseSync): void {
  d.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  const applied = new Set(
    (d.prepare('SELECT version FROM _migrations').all() as { version: number }[]).map((r) => r.version)
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    d.exec(m.sql);
    d.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      m.version,
      m.name,
      new Date().toISOString()
    );
  }
}

export function closeDb(): void {
  db?.close();
  db = null;
}
