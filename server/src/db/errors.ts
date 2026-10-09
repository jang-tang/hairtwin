import { AppError } from '../utils/http.js';
import { causeDiagnostic } from '../utils/errorLog.js';

/** Keep database messages, SQL and connection credentials out of API responses. */
export function databaseError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  const code = causeDiagnostic(error)?.code;
  const diagnostics = { cause: causeDiagnostic(error) };
  const message = (error as { message?: unknown } | null)?.message;
  if (message === 'timeout exceeded when trying to connect' || message === 'Connection terminated unexpectedly' || message === 'Connection terminated')
    return new AppError(503, 'DATABASE_UNAVAILABLE', 'DB 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.', undefined, diagnostics);
  if (code && ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EPIPE',
    '08000', '08001', '08003', '08004', '08006', '08007', '08P01', '53300', '57P01', '57P02', '57P03', '57014', '55P03'].includes(code))
    return new AppError(503, 'DATABASE_UNAVAILABLE', 'DB 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.', undefined, diagnostics);
  if (code && ['23505', '23503', '40001', '40P01'].includes(code))
    return new AppError(409, 'DATABASE_CONFLICT', '다른 요청과 충돌했습니다. 저장 상태를 확인한 뒤 다시 시도해주세요.', undefined, diagnostics);
  if (code === '23514')
    return new AppError(400, 'DATABASE_CONSTRAINT', '저장할 데이터의 연결 관계를 확인해주세요.', undefined, diagnostics);
  return error;
}
