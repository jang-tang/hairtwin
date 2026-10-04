import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, ConsultationRecord } from '../types';

interface AuthState { designer: string; loggedIn: boolean; login: (name?: string) => void; logout: () => void; }
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      designer: '지수 디자이너', loggedIn: false,
      login: (name) => set((s) => ({ loggedIn: true, designer: name || s.designer })),
      logout: () => set({ loggedIn: false })
    }),
    { name: 'ht-auth' }
  )
);

interface DashState {
  customers: Customer[];
  records: ConsultationRecord[];
  addCustomer: (c: Customer) => void;
  addRecord: (r: ConsultationRecord) => void;
}
const seedCustomers: Customer[] = [
  { id: 'c1', name: '김민지', phone: '010-1234-5678', lastVisit: '2026-09-20', historyCount: 3 },
  { id: 'c2', name: '박서연', phone: '010-2222-3333', lastVisit: '2026-09-25', historyCount: 1 }
];
export const useDash = create<DashState>()(
  persist(
    (set) => ({
      customers: seedCustomers, records: [],
      addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
      addRecord: (r) => set((s) => ({ records: [r, ...s.records] }))
    }),
    { name: 'ht-dash' }
  )
);

interface UiState { toast: string | null; showToast: (m: string) => void; }
export const useUi = create<UiState>()((set) => ({
  toast: null,
  showToast: (m) => {
    set({ toast: m });
    setTimeout(() => set({ toast: null }), 1800);
  }
}));
