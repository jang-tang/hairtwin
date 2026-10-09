import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/http.js';
import { causeDiagnostic, logRequestFailure } from '../utils/errorLog.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', '요청한 경로를 찾을 수 없습니다.'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const reply = (status: number, code: string, message: string, details?: unknown) => {
    logRequestFailure(req, res, status, code, message, err instanceof AppError ? err.diagnostics : { cause: causeDiagnostic(err) });
    if (res.headersSent) return;
    res.status(status).json({ ok: false, error: { code, message, requestId: res.locals.requestId, ...(details !== undefined ? { details } : {}) } });
  };
  if (err instanceof ZodError) {
    reply(400, 'VALIDATION_FAILED', '요청 형식이 올바르지 않습니다.', err.flatten());
    return;
  }
  if (err instanceof AppError) {
    reply(err.status, err.code, err.message, err.details);
    return;
  }
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    const message = status === 413 ? '요청 데이터 용량이 너무 큽니다.' : status === 400 ? '요청 형식이 올바르지 않습니다.' : '요청을 처리하지 못했습니다.';
    const code = status === 502 ? 'EXTERNAL_API_ERROR' : 'REQUEST_FAILED';
    reply(status, code, message);
    return;
  }
  reply(500, 'INTERNAL_ERROR', '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
}
