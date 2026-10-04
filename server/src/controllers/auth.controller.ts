import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/auth.service.js';

export async function postLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const out = await service.login(req.body as { name: string; password?: string });
    res.json({ ok: true, data: out });
  } catch (e) {
    next(e);
  }
}

export async function postRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const out = await service.register(req.body as { name: string; password: string });
    res.status(201).json({ ok: true, data: out });
  } catch (e) {
    next(e);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const designerId = (req as Request & { designerId: string }).designerId;
    res.json({ ok: true, data: { designer: service.me(designerId) } });
  } catch (e) {
    next(e);
  }
}
