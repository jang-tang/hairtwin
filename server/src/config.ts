import 'node:process';

function databaseProvider(): 'sqlite' | 'postgres' {
  const value = process.env.DB_PROVIDER ?? (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
  if (value !== 'sqlite' && value !== 'postgres') throw new Error('DB_PROVIDER must be sqlite or postgres');
  return value;
}

function integerEnv(key: string, fallback: number, max: number): number {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${key} must be an integer between 1 and ${max}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // sqlite file. :memory: 도 허용 (테스트용)
  dbPath: process.env.DB_PATH ?? './data/hairtwin.sqlite',
  dbProvider: databaseProvider(),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseCaPath: process.env.DATABASE_CA_PATH ?? '',
  databasePoolMax: integerEnv('DB_POOL_MAX', 5, 50),
  databaseConnectTimeoutMs: integerEnv('DB_CONNECT_TIMEOUT_MS', 15_000, 120_000),
  databaseStatementTimeoutMs: integerEnv('DB_STATEMENT_TIMEOUT_MS', 30_000, 300_000),
  databaseLockTimeoutMs: integerEnv('DB_LOCK_TIMEOUT_MS', 10_000, 120_000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '14d',
  // mock | real. real은 .env에 각 provider key가 필요
  authProvider: process.env.AUTH_PROVIDER ?? 'mock',
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  // real AI provider용 (없으면 mock으로 폴백)
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  imageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  seedDemo: (process.env.SEED_DEMO ?? 'true') === 'true',
};

export const isProd = config.nodeEnv === 'production';
