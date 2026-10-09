// Explicit, opt-in integration check. Creates synthetic records in the configured Supabase DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';
import { config } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { initializeDb, getDb, transaction, closeDb } from '../src/db/database.js';
import { getImageProvider } from '../src/providers/image/index.js';
import type { ImageExecution } from '../src/providers/image/types.js';

assert.equal(config.dbProvider, 'postgres', 'This check requires DB_PROVIDER=postgres');
assert.equal(config.aiProvider, 'mock', 'Use mock AI; this check must not make paid image calls');
assert.equal(config.authProvider, 'mock', 'This check uses synthetic mock accounts');
await initializeDb();
const server = buildApp().listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
let token = '';
async function request(path: string, method = 'GET', body?: unknown, auth = token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json() as any;
  if (!result.ok) return { ...result, status: response.status };
  return { ...result, status: response.status };
}
async function until(id: string, status: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const response = await request('/ai/jobs/' + id);
    assert.equal(response.ok, true);
    if (response.data.status === status) return response.data;
    if (response.data.status === 'failed' && status === 'completed') throw new Error('Unexpected image job failure: ' + response.data.error?.code);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Image job did not reach ' + status);
}
const suffix = randomUUID().slice(0, 8);
const image = new PNG({ width: 16, height: 16 }); image.data.fill(200);
for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
const photo = 'data:image/png;base64,' + PNG.sync.write(image).toString('base64');
const provider = getImageProvider();
const originalGenerate = provider.generate.bind(provider);
const calls = new Map<string, number>();
let failOnce = true;
provider.generate = (input, execution?: ImageExecution) => originalGenerate(input, execution && {
  ...execution, image: (id, work) => execution.image(id, async () => {
    calls.set(id, (calls.get(id) ?? 0) + 1);
    if (id === 'A:side' && failOnce) { failOnce = false; throw new Error('synthetic one-time image failure'); }
    return work();
  }),
});
try {
  const health = await request('/health'); assert.equal(health.data.database.provider, 'postgres');
  const logins = await Promise.all([request('/auth/login','POST',{ name: 'DB 검증 ' + suffix }), request('/auth/login','POST',{ name: 'DB 검증 ' + suffix })]);
  assert.equal(logins[0].data.designer.id, logins[1].data.designer.id);
  token = logins[0].data.token;
  const other = await request('/auth/login','POST',{ name: 'DB 다른 계정 ' + suffix });
  const foreignCustomer = await request('/customers','POST',{ name: '다른 소유자 고객 ' + suffix }, other.data.token);
  assert.equal((await request('/records','POST',{ customerId: foreignCustomer.data.id, customerName: '고객', views: { front: photo, side: photo, back: photo } })).status, 404);
  const customerName = 'Supabase 검증 고객 ' + suffix;
  const customer = await request('/customers','POST',{ name: customerName }); assert.equal(customer.status, 201);
  const preset = await request('/presets','POST',{ name: 'DB 검증 스타일', desc: '연결 검증', category: '레이어드' }); assert.equal(preset.status, 201);
  assert.equal((await request('/presets/' + preset.data.id,'PATCH',{ memo: 'DB에 보관' })).data.memo, 'DB에 보관');
  const input = { requestId: 'db-generate-' + suffix, customerName, intent: '연결 검증', photos: { front: photo, side: photo, back: photo },
    presetId: preset.data.id, preset: { id: preset.data.id, name: 'DB 검증 스타일', desc: '연결 검증' },
    condition: { damage: '건강', texture: '직모', thickness: '보통', density: '보통', elasticity: '보통', feel: '보통' }, bang: 45, sideLength: 50, sideHair: '조금 뜸' };
  const starts = await Promise.all([request('/ai/jobs/generate','POST',input),request('/ai/jobs/generate','POST',input)]);
  assert.equal(starts[0].status, 202); assert.equal(starts[0].data.id, starts[1].data.id);
  const jobId = starts[0].data.id;
  const failed = await until(jobId, 'failed'); assert.equal(failed.completed, 8);
  await request('/ai/jobs/' + jobId + '/retry','POST');
  const generated = (await until(jobId,'completed')).result;
  assert.equal(calls.get('A:side'), 2);
  for (const [id, count] of calls) if (id !== 'A:side') assert.equal(count, 1);
  const edited = await request('/ai/jobs/edit','POST',{ requestId: 'db-edit-' + suffix, sessionId: generated.sessionId,
    baseVersionId: generated.versions[0].id, view: 'front', region: null, feedback: ['더 가볍게'], freeText: '검증',
    condition: input.condition, bang: 45, sideLength: 50, sideHair: '조금 뜸' });
  const version = (await until(edited.data.id,'completed')).result.version;
  const recordInput = { customerId: customer.data.id, customerName, views: input.photos, sessionId: generated.sessionId,
    selectedVersionId: version.id, stylistReview: { versionId: version.id, possible: '조건부 가능', curl: '약', sideControl: '다운', notes: ['손상 모발 주의'], memo: '합성 사진으로 DB 저장 확인' } };
  const records = await Promise.all([request('/records','POST',recordInput),request('/records','POST',recordInput)]);
  assert.equal(records[0].status, 201); assert.equal(records[0].data.id, records[1].data.id);
  assert.equal((await request('/customers/' + customer.data.id)).data.historyCount, 1);
  const invalidRecord = (tx: ReturnType<typeof getDb>, id: string, customerId: string | null, sessionId: string | null, versionId: string | null) =>
    tx.prepare('INSERT INTO consultation_records (id, designer_id, customer_id, customer_name, date, ai_session_id, selected_version_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id + suffix, logins[0].data.designer.id, customerId, '무결성 검증', '2026-10-08', sessionId, versionId);
  const constraintFails = async (work: Parameters<typeof transaction>[0], sqlState: string) =>
    assert.rejects(transaction(work), (error: any) => error.diagnostics?.cause?.code === sqlState);
  await constraintFails(tx => invalidRecord(tx, 'foreign-', foreignCustomer.data.id, null, null), '23503');
  await constraintFails(tx => invalidRecord(tx, 'duplicate-', null, generated.sessionId, version.id), '23505');
  await constraintFails(tx => invalidRecord(tx, 'missing-version-', null, generated.sessionId, null), '23514');
  await constraintFails(async tx => {
    const temporarySession = 'integrity-session-' + suffix;
    await tx.prepare('INSERT INTO ai_sessions (id, designer_id, request_id, input_json, candidates_json, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(temporarySession, logins[0].data.designer.id, temporarySession, '{}', '[]', 'mock', new Date().toISOString());
    await invalidRecord(tx, 'wrong-version-', null, temporarySession, version.id);
  }, '23503');
  for (const path of ['/records/' + records[0].data.id,'/ai/sessions/' + generated.sessionId,'/ai/jobs/' + jobId,'/customers/' + customer.data.id,'/presets/' + preset.data.id])
    assert.equal((await request(path,'GET',undefined,other.data.token)).status, 404);
  await assert.rejects(transaction(async tx => {
    await tx.prepare('INSERT INTO customers (id, designer_id, name) VALUES (?, ?, ?)').run('rollback-' + suffix, logins[0].data.designer.id, 'rollback');
    throw new Error('rollback-check');
  }), /rollback-check/);
  assert.equal(await getDb().prepare('SELECT id FROM customers WHERE id = ?').get('rollback-' + suffix), undefined);
  await closeDb(); await initializeDb();
  const saved = await request('/records/' + records[0].data.id);
  assert.deepEqual(saved.data.stylistReview, recordInput.stylistReview);
  assert.equal((await request('/ai/sessions/' + generated.sessionId)).data.versions.length, 4);
  assert.equal((await request('/ai/jobs/' + jobId)).data.status, 'completed');
  console.log(JSON.stringify({ result: 'passed', database: 'postgres', recordId: saved.data.id, designerName: 'DB 검증 ' + suffix,
    checks: ['health','concurrent login','customer/preset CRUD','concurrent job deduplication','8/9 progress','one-image retry','edit version','review record','concurrent record deduplication','owner isolation','foreign customer rejection','DB foreign-key/check/unique constraints','rollback','reconnect persistence'] }));
} finally {
  provider.generate = originalGenerate;
  await new Promise<void>(resolve => server.close(() => resolve()));
  await closeDb();
}
