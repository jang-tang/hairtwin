import { getDb } from '../db/database.js';
import { nowIso } from '../utils/ids.js';
import type { AiJob, EditRequest, GenerateInput } from '../providers/image/types.js';

export interface StoredJob extends AiJob {
  designerId: string; provider: 'mock' | 'real';
  input: GenerateInput | EditRequest; images: Record<string, string>;
}
export function findJob(designerId: string, id: string): StoredJob | null {
  const row = getDb().prepare('SELECT state_json FROM ai_jobs WHERE id = ? AND designer_id = ?').get(id, designerId) as { state_json: string } | undefined;
  return row ? JSON.parse(row.state_json) : null;
}
export function findJobByRequest(designerId: string, operation: AiJob['operation'], requestId: string): StoredJob | null {
  const row = getDb().prepare('SELECT state_json FROM ai_jobs WHERE designer_id = ? AND operation = ? AND request_id = ?').get(designerId, operation, requestId) as { state_json: string } | undefined;
  return row ? JSON.parse(row.state_json) : null;
}
export function saveJob(job: StoredJob): void {
  const now = nowIso();
  getDb().prepare(`INSERT INTO ai_jobs (id, designer_id, operation, request_id, state_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`)
    .run(job.id, job.designerId, job.operation, job.input.requestId, JSON.stringify(job), now, now);
}
