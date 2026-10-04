/**
 * Express 백엔드 API 클라이언트.
 * - base: VITE_API_URL (기본 '/api'. dev에서는 vite proxy → localhost:8787)
 * - 인증: localStorage 'ht-token' (Bearer JWT)
 * - 백엔드 응답 envelope: {ok:true,data,meta?} / {ok:false,error:{code,message}}
 * - 백엔드 unreachable 시 ApiError(CONNECTION_FAILED) → 각 스토어가 로컬 폴백으로 동작
 */
import type { ConsultationRecord, Customer } from '../types';
import type { StylistPreset } from '../stores/presetStore';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'ht-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, 'CONNECTION_FAILED', '서버에 연결할 수 없습니다. 오프라인 모드로 동작합니다.');
  }
  let json: { ok: boolean; data?: T; meta?: PageMeta; error?: { code: string; message: string } };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', `서버 응답 오류 (${res.status})`);
  }
  if (!res.ok || !json.ok) {
    throw new ApiError(res.status, json.error?.code ?? 'REQUEST_FAILED', json.error?.message ?? `요청 실패 (${res.status})`);
  }
  return json.data as T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Designer {
  id: string;
  name: string;
  createdAt: string;
}

export const api = {
  login: (name: string) =>
    request<{ token: string; designer: Designer }>('/auth/login', { method: 'POST', body: JSON.stringify({ name }) }, false),
  me: () => request<{ designer: Designer }>('/auth/me'),

  customers: {
    list: (search = '') =>
      request<Customer[]>(`/customers?${new URLSearchParams({ search, limit: '100' })}`).then((data) => data as unknown as Customer[]),
    create: (c: { name: string; phone?: string; lastVisit?: string }) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(c) }),
    remove: (id: string) => request<{ deleted: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
  },

  presets: {
    list: () => request<StylistPreset[]>(`/presets?${new URLSearchParams({ limit: '100' })}`),
    create: (p: Omit<StylistPreset, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<StylistPreset>('/presets', { method: 'POST', body: JSON.stringify(p) }),
    update: (id: string, p: Partial<Omit<StylistPreset, 'id' | 'createdAt'>>) =>
      request<StylistPreset>(`/presets/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
    remove: (id: string) => request<{ deleted: boolean }>(`/presets/${id}`, { method: 'DELETE' }),
  },

  records: {
    list: () => request<ConsultationRecord[]>(`/records?${new URLSearchParams({ limit: '100' })}`),
    create: (r: {
      customerId?: string;
      customerName: string;
      date: string;
      styleName: string;
      views: { front: string; side: string; back: string };
      intent: string;
      adjustments: string[];
      condition: ConsultationRecord['condition'];
    }) => request<ConsultationRecord>('/records', { method: 'POST', body: JSON.stringify(r) }),
  },

  ai: {
    generate: (body: { prompt?: string; presetId?: string; customerName?: string }) =>
      request<{ candidates: { id: string; name: string; desc: string; views: { front: string; side: string; back: string } }[]; mock: boolean; provider: string }>(
        '/ai/generate',
        { method: 'POST', body: JSON.stringify(body) }
      ),
    edit: (body: { image: string; region: unknown; bang: number; sideLength?: number; sideHair?: string; condition?: unknown; feedback: string[] }) =>
      request<{ ok: boolean; mock: boolean; summary: string; provider: string }>('/ai/edit', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};

export function isOnlineError(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 'CONNECTION_FAILED' || e.status === 0);
}
