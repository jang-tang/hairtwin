import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/ai.service.js';
import type { AuthedRequest } from '../middleware/auth.js';
export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.generate((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export async function edit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ ok: true, data: await service.edit((req as AuthedRequest).designerId!, req.body) }); } catch (e) { next(e); }
}
export function getSession(req: Request, res: Response, next: NextFunction): void {
  try { res.json({ ok: true, data: service.getSession((req as AuthedRequest).designerId!, req.params.id) }); } catch (e) { next(e); }
}
