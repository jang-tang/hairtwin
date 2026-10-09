-- Server-only schema; browser Supabase Auth/Data API roles cannot read these tables.
CREATE SCHEMA IF NOT EXISTS hairtwin;
REVOKE ALL ON SCHEMA hairtwin FROM PUBLIC, anon, authenticated;
DO $role$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hairtwin_app') THEN
    CREATE ROLE hairtwin_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $role$;
SET search_path = hairtwin, pg_catalog;



    CREATE TABLE IF NOT EXISTS designers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      updated_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_designers_name ON designers(name);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      last_visit TEXT,
      history_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      updated_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_designer ON customers(designer_id);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(designer_id, name);

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      length TEXT NOT NULL DEFAULT '',
      bang TEXT NOT NULL DEFAULT '',
      perm TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      memo TEXT NOT NULL DEFAULT '',
      ref_images TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      updated_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_presets_designer ON presets(designer_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_presets_category ON presets(designer_id, category);

    CREATE TABLE IF NOT EXISTS consultation_records (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      style_name TEXT NOT NULL DEFAULT '',
      views TEXT NOT NULL DEFAULT '{}',
      intent TEXT NOT NULL DEFAULT '',
      adjustments TEXT NOT NULL DEFAULT '[]',
      condition_json TEXT,
      created_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      updated_at TEXT NOT NULL DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_designer ON consultation_records(designer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_customer ON consultation_records(customer_id, created_at DESC);


    CREATE TABLE ai_sessions (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id),
      request_id TEXT NOT NULL,
      input_json TEXT NOT NULL,
      candidates_json TEXT NOT NULL,
      provider TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(designer_id, request_id)
    );
    CREATE TABLE ai_versions (rowid BIGSERIAL UNIQUE,
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES ai_sessions(id),
      request_id TEXT NOT NULL,
      version_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, request_id)
    );
    ALTER TABLE consultation_records ADD COLUMN ai_session_id TEXT REFERENCES ai_sessions(id);
    ALTER TABLE consultation_records ADD COLUMN selected_version_id TEXT REFERENCES ai_versions(id);


    CREATE TABLE ai_jobs (
      id TEXT PRIMARY KEY,
      designer_id TEXT NOT NULL REFERENCES designers(id),
      operation TEXT NOT NULL,
      request_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(designer_id, operation, request_id)
    );
    ALTER TABLE consultation_records ADD COLUMN stylist_review_json TEXT;

CREATE INDEX idx_records_session ON consultation_records(ai_session_id);
CREATE INDEX idx_records_version ON consultation_records(selected_version_id);
GRANT USAGE ON SCHEMA hairtwin TO hairtwin_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hairtwin TO hairtwin_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hairtwin TO hairtwin_app;
REVOKE ALL ON ALL TABLES IN SCHEMA hairtwin FROM PUBLIC, anon, authenticated;
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON designers FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON customers FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON presets FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE consultation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON consultation_records FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON ai_sessions FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE ai_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON ai_versions FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_access ON ai_jobs FOR ALL TO hairtwin_app USING (true) WITH CHECK (true);
RESET search_path;
