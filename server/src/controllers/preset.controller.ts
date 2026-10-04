import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/preset.service.js';

type Authed = Request & { designerId: string };

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const out = service.listPresets((req as Authed).designerId, req.query as Record<string, unknown>);
    res.json({ ok: true, data: out.items, meta: out.meta });
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ ok: true, data: service.getPreset((req as Authed).designerId, req.params.id) });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = service.createPreset((req as Authed).designerId, req.body);
    res.status(201).json({ ok: true, data: created });
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ ok: true, data: service.updatePreset((req as Authed).designerId, req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    service.deletePreset((req as Authed).designerId, req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
}
