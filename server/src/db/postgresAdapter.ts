import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import { Pool, type PoolClient, type PoolConfig } from 'pg';
import { config } from '../config.js';
import { causeDiagnostic } from '../utils/errorLog.js';
import { databaseError } from './errors.js';
import { postgresSql } from './postgresSql.js';
import { assertPostgresSchema } from './schema.js';
import type { DatabaseAdapter } from './types.js';

export function postgresOptions(connectionString: string, caPath = config.databaseCaPath): PoolConfig {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URL');
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(), max: config.databasePoolMax,
    connectionTimeoutMillis: config.databaseConnectTimeoutMs, idleTimeoutMillis: 30_000,
    statement_timeout: config.databaseStatementTimeoutMs, application_name: 'hairtwin-server',
    ssl: { rejectUnauthorized: true, ...(caPath ? { ca: fs.readFileSync(caPath, 'utf8') } : {}) },
  };
}
async function checked<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) { throw databaseError(error); }
}
export function createPostgresAdapter(): DatabaseAdapter {
  const context = new AsyncLocalStorage<PoolClient>();
  let pool: Pool | undefined;
  let initialized: Promise<void> | undefined;
  function getPool(): Pool {
    if (!config.databaseUrl) throw new Error('DB_PROVIDER=postgres requires DATABASE_URL in server/.env');
    if (!pool) {
      pool = new Pool(postgresOptions(config.databaseUrl));
      pool.on('error', error => console.error(JSON.stringify({ event: 'database.connection.failed', cause: causeDiagnostic(error) })));
    }
    return pool;
  }
  return {
    initialize: async () => {
      initialized ??= checked(async () => {
        await assertPostgresSchema(sql => getPool().query(sql));
        await getPool().query('SELECT id FROM hairtwin.designers LIMIT 1');
      }).catch(error => { initialized = undefined; throw error; });
      await initialized;
    },
    query: (sql, values) => checked(async () => {
      const connection = context.getStore() ?? getPool();
      const result = await connection.query(postgresSql(sql), values);
      // Preserve the numeric SQLite COUNT(*) repository contract.
      for (const row of result.rows) if (typeof row.c === 'string' && /^\d+$/.test(row.c)) row.c = Number(row.c);
      return { rows: result.rows, changes: result.rowCount ?? 0 };
    }),
    lock: key => checked(async () => {
      const client = context.getStore();
      if (!client) throw new Error('Database locks require a transaction');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    }),
    transaction: async work => {
      if (context.getStore()) throw new Error('Nested transactions are not supported');
      const client = await checked(() => getPool().connect());
      let discard = false;
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('lock_timeout', $1, true)", [String(config.databaseLockTimeoutMs)]);
        const result = await context.run(client, work);
        await client.query('COMMIT'); return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
        throw databaseError(error);
      } finally { client.release(discard); }
    },
    close: async () => {
      const closing = pool;
      pool = undefined; initialized = undefined;
      await closing?.end();
    },
  };
}
