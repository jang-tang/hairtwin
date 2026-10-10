import { getDb, transaction } from '../db/database.js';
import { newId, nowIso } from '../utils/ids.js';
import { causeDiagnostic } from '../utils/errorLog.js';

export interface PreRegistrationInput {
  salonName: string;
  email: string;
  contactName?: string;
  region?: string;
  consent: true;
  website?: string;
}
export const PRE_REGISTRATION_CONSENT_VERSION = '2026-10-10';

export async function purgeExpiredPreRegistrations(): Promise<void> {
  await getDb().prepare('DELETE FROM pre_registrations WHERE expires_at <= ?').run(nowIso());
}

export async function registerSalon(input: PreRegistrationInput): Promise<{ registered: true }> {
  const now = nowIso();
  const expires = new Date(Date.parse(now) + 365 * 24 * 60 * 60 * 1000).toISOString();
  await transaction(async db => {
    await db.prepare('DELETE FROM pre_registrations WHERE expires_at <= ?').run(now);
    // A public retry must never overwrite another applicant's contact information.
    await db.prepare(`INSERT INTO pre_registrations
      (id, salon_name, email, contact_name, region, consent_version, consented_at, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(salon_name, email) DO NOTHING`)
      .run(newId('pr'), input.salonName, input.email, input.contactName ?? '', input.region ?? '',
        PRE_REGISTRATION_CONSENT_VERSION, now, now, expires);
  });
  // Do not expose whether an email already exists, row IDs, or other submissions.
  return { registered: true };
}

export function startPreRegistrationCleanup(): () => void {
  const timer = setInterval(() => {
    void purgeExpiredPreRegistrations().catch(error => {
      console.error(JSON.stringify({ event: 'pre_registration.cleanup.failed', cause: causeDiagnostic(error) }));
    });
  }, 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
