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
  {
    version: 2,
    name: 'ai_sessions_and_versions',
    sql: `
    CREATE TABLE ai_sessions (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id),
      request_id TEXT NOT NULL,
      input_json TEXT NOT NULL,
      candidates_json TEXT NOT NULL,
      provider TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(designer_id, request_id)
    );
    CREATE TABLE ai_versions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES ai_sessions(id),
      request_id TEXT NOT NULL,
      version_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, request_id)
    );
    ALTER TABLE consultation_records ADD COLUMN ai_session_id TEXT REFERENCES ai_sessions(id);
    ALTER TABLE consultation_records ADD COLUMN selected_version_id TEXT REFERENCES ai_versions(id);
    `,
  },
  {
    version: 3, name: 'ai_jobs_and_stylist_review',
    sql: `
    CREATE TABLE ai_jobs (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id),
      operation TEXT NOT NULL,
      request_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(designer_id, operation, request_id)
    );
    ALTER TABLE consultation_records ADD COLUMN stylist_review_json TEXT;
    `,
  },
  {
    version: 4, name: 'record_integrity',
    sql: `
    CREATE UNIQUE INDEX idx_records_active_session ON consultation_records (designer_id, ai_session_id)
      WHERE deleted_at IS NULL AND ai_session_id IS NOT NULL;
    CREATE TRIGGER records_integrity_insert BEFORE INSERT ON consultation_records BEGIN
      SELECT RAISE(ABORT, 'record customer owner mismatch') WHERE NEW.customer_id IS NOT NULL AND
        NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND designer_id = NEW.designer_id);
      SELECT RAISE(ABORT, 'record session version mismatch') WHERE
        (NEW.ai_session_id IS NULL) != (NEW.selected_version_id IS NULL) OR
        (NEW.ai_session_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM ai_sessions s JOIN ai_versions v ON v.session_id = s.id
          WHERE s.id = NEW.ai_session_id AND s.designer_id = NEW.designer_id AND v.id = NEW.selected_version_id));
    END;
    CREATE TRIGGER records_integrity_update BEFORE UPDATE OF designer_id, customer_id, ai_session_id, selected_version_id ON consultation_records BEGIN
      SELECT RAISE(ABORT, 'record customer owner mismatch') WHERE NEW.customer_id IS NOT NULL AND
        NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND designer_id = NEW.designer_id);
      SELECT RAISE(ABORT, 'record session version mismatch') WHERE
        (NEW.ai_session_id IS NULL) != (NEW.selected_version_id IS NULL) OR
        (NEW.ai_session_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM ai_sessions s JOIN ai_versions v ON v.session_id = s.id
          WHERE s.id = NEW.ai_session_id AND s.designer_id = NEW.designer_id AND v.id = NEW.selected_version_id));
    END;
    `,
  },
  {
    version: 5, name: 'salon_pre_registrations',
    sql: `
      CREATE TABLE pre_registrations (
        id TEXT PRIMARY KEY,
        salon_name TEXT NOT NULL,
        email TEXT NOT NULL,
        contact_name TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        consent_version TEXT NOT NULL,
        consented_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        UNIQUE(salon_name, email)
      );
      CREATE INDEX idx_pre_registrations_expiry ON pre_registrations(expires_at);
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
  try { migrate(db); } catch (error) { db.close(); db = null; throw error; }
  return db;
}

function migrate(d: DatabaseSync): void {
  d.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  const applied = new Set(
    (d.prepare('SELECT version FROM _migrations').all() as { version: number }[]).map((r) => r.version)
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    d.exec('BEGIN IMMEDIATE');
    try {
      d.exec(m.sql);
      d.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)').run(m.version, m.name, new Date().toISOString());
      d.exec('COMMIT');
    } catch (error) { d.exec('ROLLBACK'); throw error; }
  }
}

export function closeDb(): void {
  db?.close();
  db = null;
}
