import type { NextFunction, Request, Response } from 'express';
import { registerSalon } from '../services/preRegistration.service.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json({ ok: true, data: await registerSalon(req.body) }); }
  catch (error) { next(error); }
}
