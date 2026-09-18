import type { ConsultationReport } from '../types/consultation';

const KEY = 'hair-twin-consultation-reports';

function read(): ConsultationReport[] {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as ConsultationReport[] : [];
}

export const consultationRepository = {
  getAll(): ConsultationReport[] { return read(); },
  getById(id: string) { return read().find((x) => x.id === id) ?? null; },
  getByCustomerId(customerId: string) { return read().filter((x) => x.customerId === customerId); },
  save(report: ConsultationReport) {
    localStorage.setItem(KEY, JSON.stringify([...read().filter((x) => x.id !== report.id), report]));
  },
};
