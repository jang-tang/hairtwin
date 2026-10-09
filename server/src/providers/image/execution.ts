import type { ImageExecution } from './types.js';

export function runImage(execution: ImageExecution | undefined, id: string, work: () => Promise<string>) {
  execution?.signal.throwIfAborted();
  return execution ? execution.image(id, work) : work();
}

// With jobs, finish independent images even when one fails. Direct calls retain fail-fast behavior.
export async function collectImages(execution: ImageExecution | undefined, works: (() => Promise<void>)[]) {
  let firstError: unknown;
  for (const work of works) {
    execution?.signal.throwIfAborted();
    try { await work(); } catch (error) {
      if (!execution || execution.signal.aborted) throw error;
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
}
