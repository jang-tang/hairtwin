-- Preserve owner and version relationships even if a server writer makes a mistake.
ALTER TABLE hairtwin.customers ADD CONSTRAINT customers_owner_id_unique UNIQUE (designer_id, id);
ALTER TABLE hairtwin.ai_sessions ADD CONSTRAINT sessions_owner_id_unique UNIQUE (designer_id, id);
ALTER TABLE hairtwin.ai_versions ADD CONSTRAINT versions_session_id_unique UNIQUE (session_id, id);
ALTER TABLE hairtwin.consultation_records
  ADD CONSTRAINT records_customer_owner_fk FOREIGN KEY (designer_id, customer_id)
    REFERENCES hairtwin.customers (designer_id, id) ON DELETE SET NULL (customer_id),
  ADD CONSTRAINT records_session_owner_fk FOREIGN KEY (designer_id, ai_session_id)
    REFERENCES hairtwin.ai_sessions (designer_id, id),
  ADD CONSTRAINT records_version_session_fk FOREIGN KEY (ai_session_id, selected_version_id)
    REFERENCES hairtwin.ai_versions (session_id, id),
  ADD CONSTRAINT records_session_version_pair CHECK ((ai_session_id IS NULL) = (selected_version_id IS NULL));
CREATE UNIQUE INDEX idx_records_active_session ON hairtwin.consultation_records (designer_id, ai_session_id)
  WHERE deleted_at IS NULL AND ai_session_id IS NOT NULL;
