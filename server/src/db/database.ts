import { config } from '../config.js';
import { createPostgresAdapter } from './postgresAdapter.js';
import { createSqliteAdapter } from './sqliteAdapter.js';
import type { Database } from './types.js';

export type { Database } from './types.js';
export { postgresOptions } from './postgresAdapter.js';

const adapter = config.dbProvider === 'postgres' ? createPostgresAdapter() : createSqliteAdapter();
const database: Database = {
  lock: key => adapter.lock(key),
  prepare: sql => ({
    get: async <T>(...values: unknown[]) => (await adapter.query(sql, values)).rows[0] as T | undefined,
    all: async <T>(...values: unknown[]) => (await adapter.query(sql, values)).rows as T[],
    run: async (...values) => ({ changes: (await adapter.query(sql, values)).changes }),
  }),
};

export function getDb(): Database { return database; }
export function initializeDb(): Promise<void> { return adapter.initialize(); }
export function transaction<T>(work: (db: Database) => Promise<T>): Promise<T> {
  return adapter.transaction(() => work(database));
}
export function closeDb(): Promise<void> { return adapter.close(); }
