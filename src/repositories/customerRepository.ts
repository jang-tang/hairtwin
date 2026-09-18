import type { Customer } from '../types/customer';

const KEY = 'hair-twin-customers';

const seed: Customer[] = [
  { id: 'c-1', name: '김민지', phone: '010-1234-5678', memo: '자연스러운 앞머리 선호', createdAt: '2026-09-18' },
  { id: 'c-2', name: '이서준', phone: '010-2345-6789', memo: '옆머리 뜸이 많음', createdAt: '2026-09-12' },
  { id: 'c-3', name: '박지훈', phone: '010-3456-7890', memo: '다운펌 경험 있음', createdAt: '2026-09-05' },
  { id: 'c-4', name: '최유나', phone: '010-4567-8901', memo: '레이어드 선호', createdAt: '2026-08-27' },
];

function read(): Customer[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(raw) as Customer[]; } catch { return seed; }
}

export const customerRepository = {
  getAll(): Customer[] { return read(); },
  getById(id: string): Customer | null { return read().find((x) => x.id === id) ?? null; },
  search(query: string): Customer[] {
    const q = query.trim().toLowerCase();
    if (!q) return read();
    return read().filter((x) => [x.name, x.phone ?? '', x.memo ?? ''].some((v) => v.toLowerCase().includes(q)));
  },
  save(customer: Customer) {
    const next = [...read().filter((x) => x.id !== customer.id), customer];
    localStorage.setItem(KEY, JSON.stringify(next));
    return customer;
  },
};
