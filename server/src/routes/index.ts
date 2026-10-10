import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/http.js';
import { create as createPreRegistration } from '../controllers/preRegistration.controller.js';
import { getDb } from '../db/database.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as c from '../controllers/auth.controller.js';
import * as cc from '../controllers/customer.controller.js';
import * as pc from '../controllers/preset.controller.js';
import * as rc from '../controllers/record.controller.js';
import * as ac from '../controllers/ai.controller.js';
import {
  aiEditBody,
  aiGenerateBody,
  customerBody,
  customerPatchBody,
  customerQuery,
  idParam,
  loginBody,
  pagingQuery,
  preRegistrationBody,
  presetBody,
  presetPatchBody,
  presetQuery,
  recordBody,
  recordQuery,
  registerBody,
} from './schemas.js';

export function buildRouter(): Router {
  const r = Router();
  r.post('/pre-registrations', rateLimit({
    windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', '신청 요청이 많습니다. 잠시 후 다시 시도해주세요.')),
  }), validate({ body: preRegistrationBody }), createPreRegistration);

  r.get('/health', async (_req, res, next) => {
    try {
      await getDb().prepare('SELECT 1 AS connected').get();
      res.json({ ok: true, data: { status: 'up', time: new Date().toISOString(), database: { provider: config.dbProvider, status: 'connected' } } });
    } catch (error) { next(error); }
  });

  // 인증 (mock 모드: 이름만으로 로그인, 사용자 없으면 DB에 자동 생성)
  r.post('/auth/login', validate({ body: loginBody }), c.postLogin);
  r.post('/auth/register', validate({ body: registerBody }), c.postRegister);
  r.get('/auth/me', requireAuth, c.getMe);

  // 고객
  r.get('/customers', requireAuth, validate({ query: customerQuery }), cc.list);
  r.post('/customers', requireAuth, validate({ body: customerBody }), cc.create);
  r.get('/customers/:id', requireAuth, validate({ params: idParam }), cc.getOne);
  r.patch('/customers/:id', requireAuth, validate({ params: idParam, body: customerPatchBody }), cc.patch);
  r.delete('/customers/:id', requireAuth, validate({ params: idParam }), cc.remove);

  // 프리셋
  r.get('/presets', requireAuth, validate({ query: presetQuery }), pc.list);
  r.post('/presets', requireAuth, validate({ body: presetBody }), pc.create);
  r.get('/presets/:id', requireAuth, validate({ params: idParam }), pc.getOne);
  r.patch('/presets/:id', requireAuth, validate({ params: idParam, body: presetPatchBody }), pc.patch);
  r.delete('/presets/:id', requireAuth, validate({ params: idParam }), pc.remove);

  // 상담 기록
  r.get('/records', requireAuth, validate({ query: recordQuery }), rc.list);
  r.post('/records', requireAuth, validate({ body: recordBody }), rc.create);
  r.get('/records/:id', requireAuth, validate({ params: idParam }), rc.getOne);
  r.delete('/records/:id', requireAuth, validate({ params: idParam }), rc.remove);

  // AI 이미지 (서버에서 키 사용. 키 없으면 mock provider)
  r.post('/ai/jobs/generate', requireAuth, validate({ body: aiGenerateBody }), ac.startGeneration);
  r.post('/ai/jobs/edit', requireAuth, validate({ body: aiEditBody }), ac.startEdit);
  r.get('/ai/jobs/:id', requireAuth, validate({ params: idParam }), ac.getJob);
  r.post('/ai/jobs/:id/cancel', requireAuth, validate({ params: idParam }), ac.cancelJob);
  r.post('/ai/jobs/:id/retry', requireAuth, validate({ params: idParam }), ac.retryJob);
  r.post('/ai/generate', requireAuth, validate({ body: aiGenerateBody }), ac.generate);
  r.post('/ai/edit', requireAuth, validate({ body: aiEditBody }), ac.edit);
  r.get('/ai/sessions/:id', requireAuth, validate({ params: idParam }), ac.getSession);

  void pagingQuery;
  return r;
}
