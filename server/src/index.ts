import { buildApp } from './app.js';
import { config } from './config.js';
import { initializeDb, closeDb } from './db/database.js';
import { shutdownJobs } from './services/aiJob.service.js';
import { runSeed } from './db/seed.js';
import { causeDiagnostic } from './utils/errorLog.js';
import { createShutdownHandler } from './serverLifecycle.js';

async function main(): Promise<void> {
  // DB 연결(마이그레이션) + 데모 시드
  await initializeDb();
  if (config.seedDemo) {
    try {
      await runSeed();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ event: 'database.seed.failed', cause: causeDiagnostic(e) }));
    }
  }
  const app = buildApp();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[hairtwin-server] listening on :${config.port} (auth=${config.authProvider}, ai=${config.aiProvider}, db=${config.dbProvider})`);
  });
  const shutdown = createShutdownHandler(server, { stopJobs: shutdownJobs, closeDatabase: closeDb });
  let stopping: Promise<void> | undefined;
  const stop = () => stopping ??= shutdown().then(() => {
    console.log(JSON.stringify({ event: 'server.stopped' }));
  }).catch(error => {
    console.error(JSON.stringify({ event: 'server.shutdown.failed', cause: causeDiagnostic(error) }));
    process.exitCode = 1;
  });
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
  server.on('error', error => {
    console.error(JSON.stringify({ event: 'server.listen.failed', cause: causeDiagnostic(error) }));
    process.exitCode = 1;
    void stop();
  });
}

void main().catch(async error => {
  console.error(JSON.stringify({ event: 'database.startup.failed', cause: causeDiagnostic(error) }));
  process.exitCode = 1;
  await closeDb();
});
