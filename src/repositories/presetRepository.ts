import type { StylePreset } from '../types/style';

const KEY = 'hair-twin-presets';

const seed: StylePreset[] = [
  { id: 'p-1', salonId: 'salon-1', name: 'Soft See-through', description: '자연스럽고 가벼운 앞머리', category: 'style', target: 'unisex', tags: ['Light', 'Natural', 'Clean'], referenceImages: [], aiInstruction: '가볍고 자연스러운 시스루 앞머리', createdBy: 'stylist-1', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
  { id: 'p-2', salonId: 'salon-1', name: 'Clean Dandy', description: '정돈된 실루엣과 깔끔한 옆머리', category: 'cut', target: 'male', tags: ['Clean', 'Polished'], referenceImages: [], aiInstruction: '깔끔하고 정돈된 댄디 실루엣', createdBy: 'stylist-1', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
  { id: 'p-3', salonId: 'salon-1', name: 'Natural Layered', description: '가볍게 움직이는 내추럴 레이어드', category: 'cut', target: 'unisex', tags: ['Natural', 'Texture'], referenceImages: [], aiInstruction: '자연스러운 레이어와 움직임', createdBy: 'stylist-1', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
  { id: 'p-4', salonId: 'salon-1', name: 'Modern Bob', description: '단정하면서도 가벼운 보브', category: 'cut', target: 'female', tags: ['Bob', 'Modern'], referenceImages: [], aiInstruction: '모던하고 가벼운 보브', createdBy: 'stylist-1', createdAt: '2026-09-01', updatedAt: '2026-09-01' },
];

function read(): StylePreset[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(raw) as StylePreset[]; } catch { return seed; }
}

export const presetRepository = {
  getAll(): StylePreset[] { return read(); },
  getById(id: string): StylePreset | null { return read().find((x) => x.id === id) ?? null; },
  save(preset: StylePreset) {
    localStorage.setItem(KEY, JSON.stringify([...read().filter((x) => x.id !== preset.id), preset]));
    return preset;
  },
  remove(id: string) {
    localStorage.setItem(KEY, JSON.stringify(read().filter((x) => x.id !== id)));
  },
};
