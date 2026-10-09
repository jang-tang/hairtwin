import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';
import { PNG } from 'pngjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AppError } from '../src/utils/http.js';
import { requestContext } from '../src/middleware/requestContext.js';
import { validate } from '../src/middleware/validate.js';
import { causeDiagnostic } from '../src/utils/errorLog.js';
import { databaseError } from '../src/db/errors.js';
import type { GenerateInput } from '../src/providers/image/types.js';

process.env.NODE_ENV = 'production';
const secret = 'sk-private-token_customer-photo-and-consultation';
const logs: string[] = [];
const originalError = console.error;
let server: Server, base: string;
const p = new PNG({ width: 32, height: 32 }); p.data.fill(180);
const photo = 'data:image/png;base64,' + PNG.sync.write(p).toString('base64');
const input: GenerateInput = {
  requestId: 'test', customerName: secret, intent: secret,
  photos: { front: photo, side: photo, back: photo },
  preset: { id: 'layered', name: '레이어드', desc: '' },
  condition: { damage: '건강', texture: '직모', thickness: '보통', density: '보통', elasticity: '보통', feel: '보통' },
  bang: 45, sideLength: 50, sideHair: '조금 뜸',
};
before(async () => {
  const { errorHandler, notFoundHandler } = await import('../src/middleware/error.js');
  const { RealImageProvider } = await import('../src/providers/image/real.provider.js');
  console.error = (...values: unknown[]) => { logs.push(values.map(String).join(' ')); };
  const app = express(); app.use(requestContext); app.use(express.json());
  app.post('/unexpected', () => { throw Object.assign(new Error(secret), { code: 'ERR_SQLITE_ERROR' }); });
  app.post('/validate', validate({ body: z.object({ count: z.number() }) }), (_req, res) => res.json({ ok: true }));
  app.post('/upstream', async (_req, _res, next) => {
    try {
      await new RealImageProvider(async () => new Response(JSON.stringify({ error: {
        code: 'insufficient_quota', type: 'invalid_request_error', message: secret,
      } }), { status: 429, headers: { 'x-request-id': 'req_test_upstream' } }), secret).generate(input);
    } catch (error) { next(error); }
  });
  app.post('/known', (_req, _res, next) => next(new AppError(409, 'CONFLICT', '다른 편집이 진행 중입니다.')));
  app.post('/database-down', (_req, _res, next) => next(databaseError(Object.assign(new Error(secret), { code: '57P03' }))));
  app.post('/database-conflict', (_req, _res, next) => next(databaseError(Object.assign(new Error(secret), { code: '23505', detail: secret }))));
  app.post('/limited', rateLimit({ windowMs: 60_000, max: 1,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')),
  }), (_req, res) => res.json({ ok: true }));
  app.use(notFoundHandler); app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
});
after(async () => {
  console.error = originalError;
  await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
});
async function fail(path: string, body = JSON.stringify({ secret })) {
  const count = logs.length;
  const response = await fetch(base + path + '?customer=' + secret, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret, 'X-Request-ID': secret }, body });
  const payload = await response.json() as { error: { code: string; message: string; requestId: string; details?: unknown } };
  assert.equal(logs.length, count + 1, 'each failure emits exactly one structured log');
  const raw = logs[count], log = JSON.parse(raw);
  assert.equal(log.requestId, response.headers.get('x-request-id'));
  assert.equal(log.requestId, payload.error.requestId);
  assert.match(log.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(log.event, 'request.failed'); assert.equal(log.status, response.status);
  assert.equal(typeof log.durationMs, 'number');
  assert.ok(!raw.includes(secret)); assert.ok(!raw.includes(photo));
  assert.ok(!raw.includes('Authorization')); assert.ok(!raw.includes('?customer='));
  return { response, payload, log };
}
test('production errors correlate request IDs without logging raw errors, credentials, body or query', async () => {
  const a = await fail('/unexpected'), b = await fail('/unexpected');
  assert.equal(a.response.status, 500); assert.equal(a.log.level, 'error');
  assert.equal(a.log.route, '/unexpected'); assert.equal(a.log.cause.code, 'ERR_SQLITE_ERROR');
  assert.notEqual(a.log.requestId, b.log.requestId);
  assert.equal(a.payload.error.details, undefined);
  assert.ok(!JSON.stringify(a.payload).includes(secret));
  const diagnostic = causeDiagnostic({ name: 'Error', code: 'ERR_SQLITE_ERROR', stack: 'Error: ' + secret + '\n    at insert (C:/workspace/server/src/repositories/ai.repo.ts:35:8)' });
  assert.equal(diagnostic?.location, 'server/src/repositories/ai.repo.ts:35:8');
  assert.ok(!JSON.stringify(diagnostic).includes(secret));
});
test('upstream failure logs candidate, view, phase and safe reason without returning diagnostics to the client', async () => {
  const { response, payload, log } = await fail('/upstream');
  assert.equal(response.status, 502); assert.match(payload.error.message, /사용 한도/);
  assert.equal(log.ai.operation, 'generate'); assert.equal(log.ai.phase, 'anchor');
  assert.equal(log.ai.candidateId, 'A'); assert.equal(log.ai.view, 'front');
  assert.equal(log.ai.reason, 'upstream'); assert.equal(log.ai.upstreamStatus, 429);
  assert.equal(log.ai.upstreamCode, 'insufficient_quota');
  assert.equal(log.ai.upstreamRequestId, 'req_test_upstream');
  assert.equal(payload.error.details, undefined);
  assert.ok(!JSON.stringify(payload).includes('req_test_upstream'));
});
test('validation, conflicts, malformed JSON, rate limits and missing routes also emit a correlation log', async () => {
  assert.equal((await fail('/validate', JSON.stringify({ count: secret }))).response.status, 400);
  assert.equal((await fail('/known')).log.level, 'warn');
  assert.equal((await fail('/known')).response.status, 409);
  const malformed = await fail('/unexpected', '{"secret":"' + secret);
  assert.equal(malformed.response.status, 400);
  assert.ok(!JSON.stringify(malformed.payload).includes(secret));
  const missing = await fail('/does-not-exist');
  assert.equal(missing.response.status, 404); assert.equal(missing.log.route, '/unmatched');
  assert.equal((await fetch(base + '/limited', { method: 'POST' })).status, 200);
  const limited = await fail('/limited');
  assert.equal(limited.response.status, 429); assert.equal(limited.payload.error.code, 'RATE_LIMITED');
});

test('database failures retain SQLSTATE diagnostics and safe retry responses', async () => {
  const down = await fail('/database-down');
  assert.equal(down.response.status, 503); assert.equal(down.payload.error.code, 'DATABASE_UNAVAILABLE');
  assert.equal(down.log.cause.code, '57P03');
  const collision = await fail('/database-conflict');
  assert.equal(collision.response.status, 409); assert.equal(collision.log.cause.code, '23505');
  assert.equal(causeDiagnostic({ code: '23503' })?.code, '23503');
  assert.equal(causeDiagnostic({ code: secret })?.code, undefined);
  assert.equal(collision.payload.error.details, undefined);
  assert.equal((databaseError(new Error('timeout exceeded when trying to connect')) as AppError).status, 503);
});
