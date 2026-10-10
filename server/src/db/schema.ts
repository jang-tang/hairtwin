import type { Database } from './types.js';
import { AppError } from '../utils/http.js';

export const APP_TABLES = ['designers', 'customers', 'presets', 'consultation_records', 'ai_sessions', 'ai_versions', 'ai_jobs', 'pre_registrations'] as const;
export const RECORD_CONSTRAINTS = ['records_customer_owner_fk', 'records_session_owner_fk', 'records_version_session_fk', 'records_session_version_pair'] as const;
type InspectQuery = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
const schemaMissing = () => new AppError(500, 'DATABASE_SCHEMA_MISSING', '필수 DB 마이그레이션을 적용해주세요.');

/** Startup and db:check share this validation of complete, usable migrations. */
export async function assertPostgresSchema(query: InspectQuery): Promise<void> {
  const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'hairtwin'");
  const names = new Set(tables.rows.map(row => row.table_name));
  if (APP_TABLES.some(table => !names.has(table))) throw schemaMissing();
  const constraints = await query("SELECT conname, convalidated FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='hairtwin'");
  const validated = new Set(constraints.rows.filter(row => row.convalidated).map(row => row.conname));
  if (RECORD_CONSTRAINTS.some(name => !validated.has(name))) throw schemaMissing();
  const indexes = await query(`SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hairtwin' AND c.relname='idx_records_active_session'
    AND i.indisvalid AND i.indisunique`);
  if (!indexes.rows.length) throw schemaMissing();
}

export async function assertPostgresAccess(db: Database): Promise<void> {
  const role = await db.prepare(`SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
    FROM pg_roles WHERE rolname=current_user`).get<Record<string, unknown>>();
  if (!role || role.rolname !== 'hairtwin_app' || role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolbypassrls)
    throw new AppError(500, 'DATABASE_ROLE_UNSAFE', '앱 전용 제한 계정으로 DB를 연결해주세요.');
  const security = await db.prepare(`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE c.relrowsecurity)::int AS protected,
    count(*) FILTER (WHERE has_table_privilege('anon', c.oid, 'SELECT') OR
      has_table_privilege('authenticated', c.oid, 'SELECT'))::int AS exposed
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='hairtwin' AND c.relkind='r'`).get<{ total: number; protected: number; exposed: number }>();
  if (!security || security.total !== APP_TABLES.length || security.protected !== APP_TABLES.length || security.exposed !== 0)
    throw new AppError(500, 'DATABASE_ACCESS_UNSAFE', 'DB 테이블 수, RLS 및 공개 접근 권한을 확인해주세요.');
}
