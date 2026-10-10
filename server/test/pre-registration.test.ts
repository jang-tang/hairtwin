import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

process.env.DB_PROVIDER = 'sqlite';
process.env.DB_PATH = ':memory:';
process.env.SEED_DEMO = 'false';
let server: Server;
let base: string;
const valid = { salonName: '  테스트   미용실  ', email: ' Salon@Example.com ', consent: true, contactName: '담당자', region: '서울' };
async function post(body: unknown, url = base) {
  const response = await fetch(url + '/api/pre-registrations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as any };
}
before(async () => {
  const { buildApp } = await import('../src/app.js');
  server = buildApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
});
after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  const { closeDb } = await import('../src/db/database.js');
  await closeDb();
});
test('public registration normalizes input, stores consent and deduplicates without overwriting contact details', async () => {
  const first = await post(valid);
  assert.equal(first.status, 201);
  assert.deepEqual(first.body.data, { registered: true });
  const repeated = await post({ ...valid, contactName: '다른 담당자' });
  assert.deepEqual(repeated.body.data, first.body.data);
  const { getDb } = await import('../src/db/database.js');
  const rows = await getDb().prepare('SELECT * FROM pre_registrations').all<any>();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].salon_name, '테스트 미용실');
  assert.equal(rows[0].email, 'salon@example.com');
  assert.equal(rows[0].contact_name, '담당자');
  assert.equal(rows[0].consent_version, '2026-10-10');
  assert.equal(Date.parse(rows[0].expires_at) - Date.parse(rows[0].created_at), 365 * 24 * 60 * 60 * 1000);
  assert.equal(rows[0].consented_at, rows[0].created_at);
});
test('invalid submissions and honeypots are rejected and no public read API exposes applicants', async () => {
  for (const body of [
    { ...valid, salonName: ' ' }, { ...valid, email: 'invalid' },
    { ...valid, consent: false }, { ...valid, salonName: 'a'.repeat(101) },
    { ...valid, website: 'https://spam.example.com' },
  ]) assert.equal((await post(body)).status, 400);
  assert.equal((await fetch(base + '/api/pre-registrations')).status, 404);
  const { getDb } = await import('../src/db/database.js');
  assert.equal((await getDb().prepare('SELECT id FROM pre_registrations').all()).length, 1);
});
test('expired applications are deleted while active applications remain', async () => {
  const { getDb } = await import('../src/db/database.js');
  const { purgeExpiredPreRegistrations } = await import('../src/services/preRegistration.service.js');
  await getDb().prepare(`INSERT INTO pre_registrations
    (id, salon_name, email, consent_version, consented_at, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('expired', '만료 미용실', 'expired@example.com', '2026-10-10', '2020-01-01', '2020-01-01', '2021-01-01');
  await purgeExpiredPreRegistrations();
  assert.equal(await getDb().prepare('SELECT id FROM pre_registrations WHERE id = ?').get('expired'), undefined);
  assert.equal((await getDb().prepare('SELECT id FROM pre_registrations').all()).length, 1);
});
test('registration requests are limited to ten per hour with a structured error', async () => {
  const { buildApp } = await import('../src/app.js');
  const limited = buildApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => limited.once('listening', resolve));
  try {
    const url = 'http://127.0.0.1:' + (limited.address() as { port: number }).port;
    for (let i = 0; i < 10; i++) assert.equal((await post(valid, url)).status, 201);
    const rejected = await post(valid, url);
    assert.equal(rejected.status, 429);
    assert.equal(rejected.body.error.code, 'RATE_LIMITED');
  } finally {
    await new Promise<void>(resolve => limited.close(() => resolve()));
  }
});
