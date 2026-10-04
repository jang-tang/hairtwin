import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../utils/http.js';

/** zod 스키마로 body/query/params 검증. 실패 시 400 + details */
export function validate(schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        next(new AppError(400, 'VALIDATION_FAILED', '요청 형식이 올바르지 않습니다.', e.flatten()));
      } else {
        next(e);
      }
    }
  };
}
