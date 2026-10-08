import type { Server } from 'node:http';

interface ShutdownDependencies {
  stopJobs(): Promise<void>;
  closeDatabase(): Promise<void>;
}
function drainHttp(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close(error => {
    if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
    else resolve();
  }));
}

/** A repeated signal shares one shutdown; DB closure follows both HTTP and checkpoint drains. */
export function createShutdownHandler(server: Server, dependencies: ShutdownDependencies): () => Promise<void> {
  let shutdown: Promise<void> | undefined;
  return () => shutdown ??= (async () => {
    const deadline = setTimeout(() => process.exit(1), 30_000);
    deadline.unref();
    try {
      const results = await Promise.allSettled([drainHttp(server), dependencies.stopJobs()]);
      await dependencies.closeDatabase();
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } finally { clearTimeout(deadline); }
  })();
}
