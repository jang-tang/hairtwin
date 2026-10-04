import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/record.service.js';

type Authed = Request & { designerId: string };

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const out = service.listRecords((req as Authed).designerId, req.query as Record<string, unknown>);
    res.json({ ok: true, data: out.items, meta: out.meta });
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ ok: true, data: service.getRecord((req as Authed).designerId, req.params.id) });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = service.createRecord((req as Authed).designerId, req.body);
    res.status(201).json({ ok: true, data: created });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    service.deleteRecord((req as Authed).designerId, req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
}
