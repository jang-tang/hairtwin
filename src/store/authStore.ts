import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Stylist = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  isAuthenticated: boolean;
  stylist: Stylist | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      stylist: null,
      async login(email, password) {
        if (!email.trim() || !password.trim()) throw new Error('이메일과 비밀번호를 입력해주세요.');
        set({
          isAuthenticated: true,
          stylist: { id: 'stylist-1', name: '지수', email: email.trim() },
        });
      },
      logout() {
        set({ isAuthenticated: false, stylist: null });
      },
    }),
    { name: 'hair-twin-auth' },
  ),
);
