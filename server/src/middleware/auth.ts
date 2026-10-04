import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../utils/http.js';
import { verifyToken } from '../utils/jwt.js';

export interface AuthedRequest extends Request {
  designerId?: string;
  designerName?: string;
}

/** Authorization: Bearer <JWT> → req.designerId 주입. 없거나 위조면 401 */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    const p = verifyToken(token);
    req.designerId = p.sub;
    req.designerName = p.name;
    next();
  } catch {
    next(unauthorized('인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.'));
  }
}
