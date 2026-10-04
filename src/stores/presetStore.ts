import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, getToken, isOnlineError } from '../api/server';

export interface StylistPreset {
  id: string;
  name: string;
  desc: string;
  category: string;
  length: string;
  bang: string;
  perm: string;
  color: string;
  memo: string;
  refImages: string[];
  createdAt: string;
  updatedAt: string;
}

export const PRESET_CATEGORIES = ['댄디', '레이어드', '허쉬', '보브', '웨이브', '펌', '염색', '숏컷'];
export const PRESET_LENGTHS = ['숏', '단발', '미디움', '롱'];
export const PRESET_BANGS = ['없음', '시스루뱅', '풀뱅', '사이드뱅', '가르마'];
export const PRESET_PERMS = ['직모', '볼륨펌', '웨이브펌', '매직·다운펌'];
export const PRESET_COLORS = ['내추럴 블랙', '다크 브라운', '애쉬', '염색 없음', '탈색·포인트'];

export const MAX_REF_IMAGES = 5;

export type PresetDraft = Omit<StylistPreset, 'id' | 'createdAt' | 'updatedAt'>;

interface PresetState {
  presets: StylistPreset[];
  status: 'idle' | 'loading' | 'ready' | 'offline' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
  addPreset: (p: PresetDraft) => Promise<StylistPreset>;
  updatePreset: (id: string, p: Partial<PresetDraft>) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
}

function localPreset(p: PresetDraft): StylistPreset {
  const now = new Date().toISOString();
  return { ...p, id: 'sp' + Date.now().toString(36), createdAt: now, updatedAt: now };
}

export const usePresets = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      status: 'idle',
      error: null,
      refresh: async () => {
        if (!getToken()) return;
        set({ status: 'loading', error: null });
        try {
          const presets = await api.presets.list();
          set({ presets, status: 'ready', error: null });
        } catch (e) {
          if (isOnlineError(e)) {
            set({ status: 'offline', error: null });
            return;
          }
          set({ status: 'error', error: e instanceof Error ? e.message : '프리셋을 불러오지 못했어요.' });
        }
      },
      addPreset: async (p) => {
        if (getToken()) {
          try {
            const created = await api.presets.create(p);
            set((s) => ({ presets: [created, ...s.presets] }));
            return created;
          } catch (e) {
            if (!isOnlineError(e)) throw e;
          }
        }
        const preset = localPreset(p);
        set((s) => ({ presets: [preset, ...s.presets] }));
        return preset;
      },
      updatePreset: async (id, p) => {
        if (getToken()) {
          try {
            const updated = await api.presets.update(id, p);
            set((s) => ({ presets: s.presets.map((x) => (x.id === id ? updated : x)) }));
            return;
          } catch (e) {
            if (!isOnlineError(e)) throw e;
          }
        }
        set((s) => ({
          presets: s.presets.map((x) => (x.id === id ? { ...x, ...p, updatedAt: new Date().toISOString() } : x)),
        }));
      },
      removePreset: async (id) => {
        if (getToken()) {
          try {
            await api.presets.remove(id);
          } catch (e) {
            if (!isOnlineError(e)) throw e;
          }
        }
        set((s) => ({ presets: s.presets.filter((x) => x.id !== id) }));
      },
    }),
    { name: 'ht-presets', partialize: (s) => ({ presets: s.presets }) }
  )
);

export function presetSummary(p: StylistPreset): string {
  return [p.category, p.length, p.bang, p.perm, p.color].filter(Boolean).join(' · ');
}
