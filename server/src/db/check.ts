import { config } from '../config.js';
import { initializeDb, getDb, closeDb } from './database.js';
import { assertPostgresAccess } from './schema.js';
import { causeDiagnostic } from '../utils/errorLog.js';
import { AppError } from '../utils/http.js';

async function check(): Promise<void> {
  await initializeDb();
  const db = getDb();
  await db.prepare('SELECT 1 AS connected').get();
  if (config.dbProvider === 'postgres') await assertPostgresAccess(db);
  console.log(JSON.stringify({ status: 'passed', database: config.dbProvider,
    checks: ['connection', 'schema', 'record integrity', ...(config.dbProvider === 'postgres' ? ['restricted role', 'RLS', 'private tables'] : [])] }));
}
try { await check(); }
catch (error) {
  console.error(JSON.stringify({ event: 'database.check.failed', ...(error instanceof AppError ? { code: error.code, message: error.message } : {}), cause: causeDiagnostic(error) }));
  process.exitCode = 1;
} finally { await closeDb(); }
