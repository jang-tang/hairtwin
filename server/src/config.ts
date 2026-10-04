import 'node:process';

function req(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${key}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // sqlite file. :memory: 도 허용 (테스트용)
  dbPath: process.env.DB_PATH ?? './data/hairtwin.sqlite',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '14d',
  // mock | real. real은 .env에 각 provider key가 필요
  authProvider: process.env.AUTH_PROVIDER ?? 'mock',
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  // real AI provider용 (없으면 mock으로 폴백)
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  seedDemo: (process.env.SEED_DEMO ?? 'true') === 'true',
};

export const isProd = config.nodeEnv === 'production';
