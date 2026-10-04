export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPage<T> {
  ok: true;
  data: T[];
  meta: PageMeta;
}

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', msg, details);
export const unauthorized = (msg = '로그인이 필요합니다.') => new AppError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = '권한이 없습니다.') => new AppError(403, 'FORBIDDEN', msg);
export const notFound = (msg = '존재하지 않는 데이터입니다.') => new AppError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string) => new AppError(409, 'CONFLICT', msg);

export function pageMeta(page: number, limit: number, total: number): PageMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function parsePaging(q: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20) || 20));
  return { page, limit };
}
