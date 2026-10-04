import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/http.js';
import { isProd } from '../config.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다.' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, error: { code: 'VALIDATION_FAILED', message: '요청 형식이 올바르지 않습니다.', details: err.flatten() } });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    const message = (err as Error)?.message || '요청을 처리하지 못했습니다.';
    const code = status === 502 ? 'EXTERNAL_API_ERROR' : 'REQUEST_FAILED';
    res.status(status).json({ ok: false, error: { code, message } });
    return;
  }
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err);
  }
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      ...(!isProd && err instanceof Error ? { details: err.message } : {}),
    },
  });
}
