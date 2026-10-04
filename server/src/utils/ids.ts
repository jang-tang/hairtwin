import crypto from 'node:crypto';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** JSON 컬럼 직렬화/역직렬화 헬퍼 */
export function toJson(v: unknown): string {
  return JSON.stringify(v ?? null);
}

export function fromJson<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
