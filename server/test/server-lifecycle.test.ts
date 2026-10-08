import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createShutdownHandler } from '../src/serverLifecycle.js';

test('shutdown drains an in-flight HTTP response and checkpoints before closing DB, once', async () => {
  let finishHttp!: () => void, finishJob!: () => void;
  const jobGate = new Promise<void>(resolve => { finishJob = resolve; });
  const events: string[] = [];
  const server = createServer((_req, res) => {
    res.write('started'); finishHttp = () => res.end('finished');
  }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const response = await fetch('http://127.0.0.1:' + (server.address() as { port: number }).port);
  const stop = createShutdownHandler(server, {
    stopJobs: async () => { events.push('abort'); await jobGate; events.push('checkpoint'); },
    closeDatabase: async () => { events.push('database closed'); },
  });
  const stopped = stop(); assert.equal(stop(), stopped);
  finishJob(); await jobGate;
  assert.ok(!events.includes('database closed'));
  finishHttp(); await response.text(); await stopped;
  assert.deepEqual(events, ['abort', 'checkpoint', 'database closed']);
});

test('shutdown cleans up DB even when jobs fail or HTTP never started', async () => {
  const server = createServer(); let closed = 0;
  const stop = createShutdownHandler(server, {
    stopJobs: async () => { throw new Error('checkpoint failed'); },
    closeDatabase: async () => { closed++; },
  });
  await assert.rejects(stop(), /checkpoint failed/);
  assert.equal(closed, 1);
});
