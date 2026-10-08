import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/ai.service.js';
import type { AuthedRequest } from '../middleware/auth.js';
import * as jobs from '../services/aiJob.service.js';
export async function startGeneration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(202).json({ ok: true, data: (await jobs.startJob((req as AuthedRequest).designerId!, 'generate', req.body)) }); } catch (e) { next(e); }
}
export async function startEdit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(202).json({ ok: true, data: (await jobs.startJob((req as AuthedRequest).designerId!, 'edit', req.body)) }); } catch (e) { next(e); }
}
export async function getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: (await jobs.getJob((req as AuthedRequest).designerId!, req.params.id)) }); } catch (e) { next(e); }
}
export async function cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: (await jobs.cancelJob((req as AuthedRequest).designerId!, req.params.id)) }); } catch (e) { next(e); }
}
export async function retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(202).json({ ok: true, data: (await jobs.retryJob((req as AuthedRequest).designerId!, req.params.id)) }); } catch (e) { next(e); }
}
export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.generate((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export async function edit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.edit((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export async function getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: (await service.getSession((req as AuthedRequest).designerId!, req.params.id)) }); } catch (e) { next(e); }
}
