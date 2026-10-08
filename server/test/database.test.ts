import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { postgresSql } from '../src/db/postgresSql.js';
process.env.DB_PROVIDER = 'sqlite';
process.env.DB_PATH = ':memory:';
const { getDb, transaction, closeDb, postgresOptions } = await import('../src/db/database.js');
after(closeDb);

test('SQL translation keeps literals/comments and separates parameters from server-only schema', () => {
  const sql = "SELECT '?' AS literal FROM customers WHERE name LIKE ? AND designer_id = ? -- customers ?\n";
  assert.equal(postgresSql(sql), "SELECT '?' AS literal FROM hairtwin.customers WHERE name ILIKE $1 AND designer_id = $2 -- customers ?\n");
  assert.equal(postgresSql("SELECT 'it''s customers ? LIKE' FROM presets WHERE id = ?"), "SELECT 'it''s customers ? LIKE' FROM hairtwin.presets WHERE id = $1");
});
test('PostgreSQL connections retain TLS certificate validation despite URL options', () => {
  const options = postgresOptions('postgresql://user:password@example.com:5432/postgres?sslmode=disable', '');
  assert.equal((options.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized, true);
  assert.equal(new URL(options.connectionString!).searchParams.has('sslmode'), false);
});
test('asynchronous SQLite rollback excludes unrelated concurrent writes', async () => {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const db = getDb();
  const failed = transaction(async tx => {
    await tx.prepare('INSERT INTO designers (id, name) VALUES (?, ?)').run('rollback', '롤백');
    entered(); await gate; throw new Error('rollback');
  });
  const rejected = assert.rejects(failed, /rollback/);
  await started;
  const outside = db.prepare('INSERT INTO designers (id, name) VALUES (?, ?)').run('outside', '다른 요청');
  release(); await rejected; await outside;
  assert.equal(await db.prepare('SELECT id FROM designers WHERE id = ?').get('rollback'), undefined);
  assert.equal((await db.prepare('SELECT id FROM designers WHERE id = ?').get('outside') as { id: string }).id, 'outside');
});

test('record integrity rejects foreign customers, mismatched versions and duplicate active sessions', async () => {
  const db = getDb();
  await db.prepare('INSERT INTO designers (id, name) VALUES (?, ?)').run('owner', '기록 소유자');
  await db.prepare('INSERT INTO customers (id, designer_id, name) VALUES (?, ?, ?)').run('foreign-customer', 'outside', '타인 고객');
  const insert = (id: string, customer: string | null, session: string | null, version: string | null) =>
    db.prepare('INSERT INTO consultation_records (id, designer_id, customer_id, customer_name, date, ai_session_id, selected_version_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, 'owner', customer, '검증', '2026-10-08', session, version);
  await assert.rejects(() => insert('foreign-record', 'foreign-customer', null, null), /owner mismatch/);
  for (const id of ['session-1', 'session-2']) {
    await db.prepare('INSERT INTO ai_sessions (id, designer_id, request_id, input_json, candidates_json, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, 'owner', id, '{}', '[]', 'mock', '2026-10-08');
    await db.prepare('INSERT INTO ai_versions (id, session_id, request_id, version_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('version-' + id, id, id, '{}', '2026-10-08');
  }
  await assert.rejects(() => insert('wrong-pair', null, 'session-1', null), /version mismatch/);
  await assert.rejects(() => insert('wrong-version', null, 'session-1', 'version-session-2'), /version mismatch/);
  await insert('valid-record', null, 'session-1', 'version-session-1');
  await assert.rejects(() => insert('duplicate', null, 'session-1', 'version-session-1'), /UNIQUE/);
  await db.prepare('UPDATE consultation_records SET deleted_at = ? WHERE id = ?').run('2026-10-08', 'valid-record');
  await insert('replacement', null, 'session-1', 'version-session-1');
});
