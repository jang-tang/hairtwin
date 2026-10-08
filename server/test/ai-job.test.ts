import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Server } from 'node:http';
import type { AiJob, GenerateInput, ImageExecution } from '../src/providers/image/types.js';

const directory = mkdtempSync(join(tmpdir(), 'hairtwin-job-test-'));
process.env.DB_PATH = join(directory, 'test.sqlite'); process.env.AI_PROVIDER = 'mock';
process.env.AUTH_PROVIDER = 'mock'; process.env.SEED_DEMO = 'false';
let server: Server, base: string, token: string, otherToken: string;
let generated: any;
const p = new PNG({ width: 16, height: 16 }); p.data.fill(180);
for (let i = 3; i < p.data.length; i += 4) p.data[i] = 255;
const photo = 'data:image/png;base64,' + PNG.sync.write(p).toString('base64');
const input: GenerateInput = {
  requestId: 'job-generate', customerName: '작업 테스트 고객', intent: '길이 유지',
  photos: { front: photo, side: photo, back: photo }, preset: { id: 'layered', name: '레이어드', desc: '가벼운 층' },
  condition: { damage: '건강', texture: '직모', thickness: '보통', density: '보통', elasticity: '보통', feel: '보통' },
  bang: 45, sideLength: 50, sideHair: '조금 뜸',
};
async function request(path: string, method = 'GET', body?: unknown, auth = token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, ...await response.json() as { ok: boolean; data: any; error?: { code: string } } };
}
async function until(id: string, done: (job: AiJob) => boolean) {
  for (let i = 0; i < 100; i++) {
    const response = await request('/ai/jobs/' + id);
    if (done(response.data)) return response.data as AiJob;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Job did not reach expected state');
}
const calls = new Map<string, number>();
let fail = '', hold = '', entered: (() => void) | undefined;
function wrap(execution?: ImageExecution): ImageExecution | undefined {
  return execution && { ...execution, image: (id, work) => execution.image(id, async () => {
    calls.set(id, (calls.get(id) ?? 0) + 1);
    if (id === hold) {
      entered?.();
      await new Promise<void>((_, reject) => {
        if (execution.signal.aborted) reject(execution.signal.reason);
        else execution.signal.addEventListener('abort', () => reject(execution.signal.reason), { once: true });
      });
    }
    if (id === fail) throw new Error('private provider failure');
    return work();
  }) };
}
before(async () => {
  const { buildApp } = await import('../src/app.js');
  const { getImageProvider } = await import('../src/providers/image/index.js');
  const provider = getImageProvider(), generate = provider.generate.bind(provider), edit = provider.edit.bind(provider);
  provider.generate = (body, execution) => generate(body, wrap(execution));
  provider.edit = (body, execution) => edit(body, wrap(execution));
  server = buildApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as { port: number }).port + '/api';
  token = (await request('/auth/login', 'POST', { name: '작업 디자이너' }, '')).data.token;
  otherToken = (await request('/auth/login', 'POST', { name: '다른 디자이너' }, '')).data.token;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  const { closeDb } = await import('../src/db/database.js'); closeDb();
  rmSync(directory, { recursive: true, force: true });
});

test('job reports actual completed images, is owner scoped, and retries only the failed image after DB reopening', async () => {
  fail = 'A:side'; calls.clear();
  const started = await request('/ai/jobs/generate', 'POST', input);
  assert.equal(started.status, 202); const id = started.data.id;
  const failed = await until(id, job => job.status === 'failed');
  assert.equal(failed.completed, 8); assert.equal(failed.total, 9); assert.equal(failed.progress, 88);
  assert.equal(failed.steps.filter(step => step.status === 'failed').length, 1);
  assert.equal((failed as any).input, undefined); assert.equal((failed as any).images, undefined);
  assert.ok(!JSON.stringify(failed).includes('private provider failure'));
  for (const action of ['', '/cancel', '/retry']) assert.equal((await request('/ai/jobs/' + id + action, action ? 'POST' : 'GET', undefined, otherToken)).status, 404);
  assert.equal((await request('/ai/jobs/generate', 'POST', input)).data.id, id);
  const { closeDb } = await import('../src/db/database.js'); closeDb();
  fail = '';
  assert.equal((await request('/ai/jobs/' + id + '/retry', 'POST')).status, 202);
  const completed = await until(id, job => job.status === 'completed');
  assert.equal(completed.progress, 100); assert.equal(completed.attempt, 2);
  assert.equal(calls.get('A:side'), 2);
  for (const [step, count] of calls) if (step !== 'A:side') assert.equal(count, 1, step);
  generated = completed.result;
  const repeated = await request('/ai/jobs/' + id + '/retry', 'POST');
  assert.equal(repeated.data.result.sessionId, generated.sessionId);
});

test('cancellation aborts active work, retains successes, and resumes without duplicate sessions', async () => {
  calls.clear(); hold = 'A:back';
  const gate = new Promise<void>(resolve => { entered = resolve; });
  const started = await request('/ai/jobs/generate', 'POST', { ...input, requestId: 'cancel-job' });
  await gate;
  const running = await request('/ai/jobs/' + started.data.id);
  assert.equal(running.data.completed, 2); assert.equal(running.data.steps[2].status, 'running');
  const { getDb } = await import('../src/db/database.js');
  const { cancelJob, retryJob, getJob } = await import('../src/services/aiJob.service.js');
  const owner = (getDb().prepare('SELECT id FROM designers WHERE name = ?').get('작업 디자이너') as { id: string }).id;
  cancelJob(owner, started.data.id);
  assert.throws(() => retryJob(owner, started.data.id), /중단하는 중/);
  assert.equal(getJob(owner, started.data.id).attempt, 1);
  const cancelled = await request('/ai/jobs/' + started.data.id + '/cancel', 'POST');
  assert.equal(cancelled.data.status, 'cancelled'); assert.equal(cancelled.data.result, undefined);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal((await request('/ai/jobs/' + started.data.id)).data.status, 'cancelled');
  const { findByRequest } = await import('../src/repositories/ai.repo.js');
  assert.equal(findByRequest(owner, 'cancel-job'), null);
  hold = ''; entered = undefined;
  await request('/ai/jobs/' + started.data.id + '/retry', 'POST');
  const completed = await until(started.data.id, job => job.status === 'completed');
  assert.equal(completed.completed, 9);
  assert.equal(calls.get('A:front'), 1); assert.equal(calls.get('A:side'), 1); assert.equal(calls.get('A:back'), 2);
});

test('edit retries keep successful views and persist exactly one version; review is validated and stored', async () => {
  calls.clear(); fail = 'A:back';
  const body = { requestId: 'edit-job', sessionId: generated.sessionId, baseVersionId: generated.versions[0].id,
    view: 'front', region: null, feedback: ['더 가볍게'], freeText: '가볍게', bang: 45, sideLength: 50, condition: input.condition, sideHair: input.sideHair };
  const started = await request('/ai/jobs/edit', 'POST', body);
  const failed = await until(started.data.id, job => job.status === 'failed');
  assert.equal(failed.completed, 2);
  assert.equal((await request('/ai/sessions/' + generated.sessionId)).data.versions.length, 3);
  fail = ''; await request('/ai/jobs/' + started.data.id + '/retry', 'POST');
  const completed = await until(started.data.id, job => job.status === 'completed');
  const result = completed.result as any;
  assert.equal(calls.get('A:front'), 1); assert.equal(calls.get('A:side'), 1); assert.equal(calls.get('A:back'), 2);
  assert.equal((await request('/ai/sessions/' + generated.sessionId)).data.versions.length, 4);
  const record = { customerName: input.customerName, views: input.photos, sessionId: generated.sessionId, selectedVersionId: result.version.id };
  const review = { versionId: result.version.id, possible: '조건부 가능', curl: '약', sideControl: '다운', notes: ['손상 모발 주의'], memo: '손상 부위를 피하고 단계적으로 진행' };
  assert.equal((await request('/records', 'POST', record)).status, 400);
  assert.equal((await request('/records', 'POST', { ...record, stylistReview: { ...review, memo: ' ' } })).status, 400);
  assert.equal((await request('/records', 'POST', { ...record, stylistReview: { ...review, versionId: generated.versions[0].id } })).status, 400);
  const saved = await request('/records', 'POST', { ...record, stylistReview: review });
  assert.equal(saved.status, 201); assert.deepEqual(saved.data.stylistReview, review);
  assert.deepEqual((await request('/records/' + saved.data.id)).data.stylistReview, review);
});

test('an interrupted job reloads checkpoints and retries missing images', async () => {
  const { findJob, saveJob } = await import('../src/repositories/aiJob.repo.js');
  const { getJob, retryJob } = await import('../src/services/aiJob.service.js');
  const { getDb } = await import('../src/db/database.js');
  const owner = (getDb().prepare('SELECT id FROM designers WHERE name = ?').get('작업 디자이너') as { id: string }).id;
  fail = 'C:back';
  const started = await request('/ai/jobs/generate', 'POST', { ...input, requestId: 'interrupted-job' });
  await until(started.data.id, job => job.status === 'failed');
  const checkpoint = findJob(owner, started.data.id)!;
  checkpoint.status = 'running'; delete checkpoint.result; delete checkpoint.error;
  delete checkpoint.images['C:back']; checkpoint.steps[8].status = 'running'; saveJob(checkpoint);
  const restored = getJob(owner, checkpoint.id);
  assert.equal(restored.status, 'failed'); assert.equal(restored.error?.code, 'JOB_INTERRUPTED');
  assert.equal(restored.completed, 8);
  calls.clear(); fail = ''; retryJob(owner, checkpoint.id);
  await until(checkpoint.id, job => job.status === 'completed');
  assert.deepEqual([...calls.entries()], [['C:back', 1]]);
});
