export interface QueryResult { rows: Record<string, unknown>[]; changes: number }
export interface Database {
  lock(key: string): Promise<void>;
  prepare(sql: string): {
    get<T = unknown>(...values: unknown[]): Promise<T | undefined>;
    all<T = Record<string, unknown>>(...values: unknown[]): Promise<T[]>;
    run(...values: unknown[]): Promise<{ changes: number }>;
  };
}
export interface DatabaseAdapter {
  initialize(): Promise<void>;
  query(sql: string, values: unknown[]): Promise<QueryResult>;
  lock(key: string): Promise<void>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
