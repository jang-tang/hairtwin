import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/ai.service.js';
import type { AuthedRequest } from '../middleware/auth.js';
import * as jobs from '../services/aiJob.service.js';
export function startGeneration(req: Request, res: Response, next: NextFunction): void {
  try { res.status(202).json({ ok: true, data: jobs.startJob((req as AuthedRequest).designerId!, 'generate', req.body) }); } catch (e) { next(e); }
}
export function startEdit(req: Request, res: Response, next: NextFunction): void {
  try { res.status(202).json({ ok: true, data: jobs.startJob((req as AuthedRequest).designerId!, 'edit', req.body) }); } catch (e) { next(e); }
}
export function getJob(req: Request, res: Response, next: NextFunction): void {
  try { res.json({ ok: true, data: jobs.getJob((req as AuthedRequest).designerId!, req.params.id) }); } catch (e) { next(e); }
}
export function cancelJob(req: Request, res: Response, next: NextFunction): void {
  try { res.json({ ok: true, data: jobs.cancelJob((req as AuthedRequest).designerId!, req.params.id) }); } catch (e) { next(e); }
}
export function retryJob(req: Request, res: Response, next: NextFunction): void {
  try { res.status(202).json({ ok: true, data: jobs.retryJob((req as AuthedRequest).designerId!, req.params.id) }); } catch (e) { next(e); }
}
export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.generate((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export async function edit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.edit((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export function getSession(req: Request, res: Response, next: NextFunction): void {
  try { res.json({ ok: true, data: service.getSession((req as AuthedRequest).designerId!, req.params.id) }); } catch (e) { next(e); }
}
