import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, ConsultationRecord } from '../types';
import { api, clearToken, getToken, isOnlineError, setToken, ApiError } from '../api/server';

interface AuthState {
  designer: string;
  loggedIn: boolean;
  /** 서버 모드 여부 (false = 백엔드 없이 로컬 동작) */
  serverMode: boolean;
  login: (name?: string) => Promise<void>;
  logout: () => void;
}
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      designer: '지수 디자이너',
      loggedIn: false,
      serverMode: false,
      login: async (name) => {
        const display = name?.trim() || '지수 디자이너';
        try {
          const { token, designer } = await api.login(display);
          setToken(token);
          set({ loggedIn: true, designer: designer.name, serverMode: true });
        } catch (e) {
          if (isOnlineError(e)) {
            // 백엔드 없이도 체험 가능 (기존 로컬 동작 유지)
            clearToken();
            set({ loggedIn: true, designer: display, serverMode: false });
            return;
          }
          throw e;
        }
      },
      logout: () => {
        clearToken();
        set({ loggedIn: false });
      },
    }),
    { name: 'ht-auth' }
  )
);

type DashStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

interface DashState {
  customers: Customer[];
  records: ConsultationRecord[];
  status: DashStatus;
  error: string | null;
  /** 서버에서 목록 동기화. 서버 없으면 로컬 캐시 유지(offline) */
  refresh: () => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  addRecord: (r: ConsultationRecord) => Promise<void>;
}
const seedCustomers: Customer[] = [
  { id: 'c1', name: '김민지', phone: '010-1234-5678', lastVisit: '2026-09-20', historyCount: 3 },
  { id: 'c2', name: '박서연', phone: '010-2222-3333', lastVisit: '2026-09-25', historyCount: 1 },
];
export const useDash = create<DashState>()(
  persist(
    (set, get) => ({
      customers: seedCustomers,
      records: [],
      status: 'idle' as DashStatus,
      error: null,
      refresh: async () => {
        if (!getToken()) return;
        set({ status: 'loading', error: null });
        try {
          const [customers, records] = await Promise.all([api.customers.list(), api.records.list()]);
          set({ customers, records, status: 'ready', error: null });
        } catch (e) {
          if (isOnlineError(e)) {
            set({ status: 'offline', error: null });
            return;
          }
          if (e instanceof ApiError && e.status === 401) {
            // 토큰 만료/무효 → 로그아웃 후 로그인 화면으로 (RequireAuth가 처리)
            useAuth.getState().logout();
            return;
          }
          set({ status: 'error', error: e instanceof Error ? e.message : '동기화에 실패했어요.' });
        }
      },
      addCustomer: async (c) => {
        if (getToken()) {
          try {
            await api.customers.create({ name: c.name, phone: c.phone, lastVisit: c.lastVisit });
            await get().refresh();
            return;
          } catch (e) {
            if (!isOnlineError(e)) throw e;
          }
        }
        set((s) => ({ customers: [c, ...s.customers] }));
      },
      addRecord: async (r) => {
        if (getToken()) {
          try {
            await api.records.create({
              customerName: r.customerName,
              date: r.date,
              styleName: r.styleName,
              views: r.views,
              intent: r.intent,
              adjustments: r.adjustments,
              condition: r.condition,
            });
            await get().refresh();
            return;
          } catch (e) {
            if (!isOnlineError(e)) throw e;
          }
        }
        set((s) => ({ records: [r, ...s.records] }));
      },
    }),
    {
      name: 'ht-dash',
      partialize: (s) => ({ customers: s.customers, records: s.records }),
    }
  )
);

interface UiState {
  toast: string | null;
  showToast: (m: string) => void;
}
export const useUi = create<UiState>()((set) => ({
  toast: null,
  showToast: (m) => {
    set({ toast: m });
    setTimeout(() => set({ toast: null }), 1800);
  },
}));
