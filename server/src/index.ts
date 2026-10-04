import { buildApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/database.js';
import { runSeed } from './db/seed.js';

async function main(): Promise<void> {
  // DB 연결(마이그레이션) + 데모 시드
  getDb();
  if (config.seedDemo) {
    try {
      runSeed();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[seed] failed:', (e as Error).message);
    }
  }
  const app = buildApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[hairtwin-server] listening on :${config.port} (auth=${config.authProvider}, ai=${config.aiProvider}, db=${config.dbPath})`);
  });
}

void main();
