CREATE TABLE hairtwin.pre_registrations (
  id TEXT PRIMARY KEY,
  salon_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE(salon_name, email)
);
CREATE INDEX idx_pre_registrations_expiry ON hairtwin.pre_registrations(expires_at);
ALTER TABLE hairtwin.pre_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hairtwin.pre_registrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON hairtwin.pre_registrations TO hairtwin_app;
CREATE POLICY server_access ON hairtwin.pre_registrations FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
