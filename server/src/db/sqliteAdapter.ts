import { AsyncLocalStorage } from 'node:async_hooks';
import type { SQLInputValue } from 'node:sqlite';
import { getDb, closeDb } from './sqlite.js';
import type { DatabaseAdapter } from './types.js';

export function createSqliteAdapter(): DatabaseAdapter {
  const context = new AsyncLocalStorage<boolean>();
  let queue = Promise.resolve();
  // An async transaction must exclude queries from unrelated requests.
  async function exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (context.getStore()) return work();
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await context.run(true, work); }
    finally { release(); }
  }
  return {
    initialize: async () => { getDb(); },
    query: (sql, values) => exclusive(async () => {
      const statement = getDb().prepare(sql);
      if (/^\s*(SELECT|WITH)\b/i.test(sql))
        return { rows: statement.all(...values as SQLInputValue[]), changes: 0 };
      return { rows: [], changes: Number(statement.run(...values as SQLInputValue[]).changes) };
    }),
    lock: async () => {
      if (!context.getStore()) throw new Error('Database locks require a transaction');
    },
    transaction: work => exclusive(async () => {
      const db = getDb();
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await work(); db.exec('COMMIT'); return result;
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* Preserve the original failure. */ }
        throw error;
      }
    }),
    close: async () => { await queue; closeDb(); },
  };
}
