import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(_req: Request, res: Response, next: NextFunction): void {
  res.locals.requestId = randomUUID();
  res.locals.startedAt = Date.now();
  res.setHeader('X-Request-ID', res.locals.requestId);
  next();
}
