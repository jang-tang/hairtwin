import type { NextFunction, Request, Response } from 'express';
import * as service from '../services/ai.service.js';
import { imageProviderKind } from '../providers/image/index.js';

export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const out = await service.generate(req.body as { prompt?: string; presetId?: string; customerName?: string });
    res.json({ ok: true, data: { ...out, provider: imageProviderKind() } });
  } catch (e) {
    next(e);
  }
}

export async function edit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      image: string;
      region: { id: string; type: string; x: number; y: number; w: number; h: number; label: string } | null;
      bang: number;
      sideLength?: number;
      sideHair?: string;
      condition?: unknown;
      feedback?: string[];
    };
    const out = await service.edit({
      image: body.image,
      region: body.region ?? null,
      bang: body.bang,
      sideLength: body.sideLength,
      sideHair: body.sideHair,
      condition: body.condition,
      feedback: body.feedback ?? [],
    });
    res.json({ ok: true, data: { ...out, provider: imageProviderKind() } });
  } catch (e) {
    next(e);
  }
}
