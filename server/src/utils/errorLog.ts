import type { Request, Response } from 'express';

export interface ErrorDiagnostics {
  ai?: {
    operation: 'generate' | 'edit';
    phase: 'anchor' | 'propagate';
    candidateId: string;
    view: 'front' | 'side' | 'back';
    model: string;
    reason: 'not_configured' | 'timeout' | 'network' | 'upstream' | 'invalid_output';
    upstreamStatus?: number;
    upstreamRequestId?: string;
    upstreamCode?: string;
    upstreamType?: string;
  };
  cause?: { name?: string; code?: string; location?: string };
}

// Only bounded identifiers are accepted; never log arbitrary external messages.
export function diagnosticIdentifier(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value) && !value.startsWith('sk-') ? value : undefined;
}
export function causeDiagnostic(error: unknown): ErrorDiagnostics['cause'] {
  const e = error as { name?: unknown; code?: unknown; stack?: unknown; cause?: { code?: unknown } } | null;
  const names = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'TimeoutError', 'AbortError', 'ZodError']);
  const frame = typeof e?.stack === 'string' ? e.stack.split('\n').slice(1).find(line => /^\s+at /.test(line) && /[\\/]server[\\/]src[\\/]/.test(line)) : undefined;
  const location = frame?.match(/server[\\/]src[\\/][A-Za-z0-9_./\\-]+:\d+:\d+/)?.[0].replace(/\\/g, '/');
  const rawCode = e?.cause?.code ?? e?.code;
  const code = typeof rawCode === 'string' && /^[0-9A-Z]{5}$/.test(rawCode) ? rawCode : diagnosticIdentifier(rawCode);
  return { name: typeof e?.name === 'string' && names.has(e.name) ? e.name : 'Error', code, location };
}

export function logRequestFailure(req: Request, res: Response, status: number, code: string, message: string, diagnostics?: ErrorDiagnostics): void {
  const entry = {
    timestamp: new Date().toISOString(), level: status >= 500 ? 'error' : 'warn', event: 'request.failed',
    requestId: res.locals.requestId, method: req.method,
    route: req.route?.path ? req.baseUrl + req.route.path : '/unmatched',
    status, code, message,
    durationMs: Math.max(0, Date.now() - (res.locals.startedAt ?? Date.now())),
    ...diagnostics,
  };
  // JSON lines on stderr are available in development and production.
  // Headers, body, URL query, photos, prompts and raw errors are deliberately omitted.
  console.error(JSON.stringify(entry));
}
