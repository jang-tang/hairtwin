import { getDb, transaction } from '../db/database.js';
import { newId, nowIso } from '../utils/ids.js';
import type { GenerateInput, GeneratedCandidate, ImageVersion, GenerationResult } from '../providers/image/types.js';

export interface AiSession extends GenerationResult { input: GenerateInput }
interface SessionRow { id: string; input_json: string; candidates_json: string; provider: 'mock' | 'real' }
async function hydrate(row: SessionRow): Promise<AiSession> {
  const versions = (await getDb().prepare('SELECT version_json FROM ai_versions WHERE session_id = ? ORDER BY rowid').all(row.id)) as {version_json: string}[];
  return { sessionId: row.id, input: JSON.parse(row.input_json), candidates: JSON.parse(row.candidates_json),
    provider: row.provider, mock: row.provider === 'mock', versions: versions.map(v => JSON.parse(v.version_json)) };
}
export async function findSession(designerId: string, id: string): Promise<AiSession | null> {
  const row = (await getDb().prepare('SELECT * FROM ai_sessions WHERE id = ? AND designer_id = ?').get(id, designerId)) as SessionRow | undefined;
  return row ? (await hydrate(row)) : null;
}
export async function findByRequest(designerId: string, requestId: string): Promise<AiSession | null> {
  const row = (await getDb().prepare('SELECT * FROM ai_sessions WHERE request_id = ? AND designer_id = ?').get(requestId, designerId)) as SessionRow | undefined;
  return row ? (await hydrate(row)) : null;
}
export async function versionByRequest(sessionId: string, requestId: string): Promise<ImageVersion | null> {
  const row = (await getDb().prepare('SELECT version_json FROM ai_versions WHERE session_id = ? AND request_id = ?').get(sessionId, requestId)) as {version_json:string} | undefined;
  return row ? JSON.parse(row.version_json) : null;
}
export async function createSession(designerId: string, input: GenerateInput, candidates: GeneratedCandidate[], provider: 'mock' | 'real'): Promise<AiSession> {
  const sessionId = newId('ais'), createdAt = nowIso();
  const versions: ImageVersion[] = candidates.map(c => ({
    id: newId('aiv'), candidateId: c.id, label: 'V1', parentId: null, createdAt, views: c.views,
    summary: c.desc, mock: provider === 'mock', settings: { bang: input.bang, sideLength: input.sideLength, sideHair: input.sideHair, condition: input.condition },
    feedback: [], freeText: '',
  }));
  const saved = candidates.map((c, i) => ({ ...c, versionId: versions[i].id }));
  await transaction(async db => {
    await db.prepare('INSERT INTO ai_sessions (id, designer_id, request_id, input_json, candidates_json, provider, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(sessionId, designerId, input.requestId, JSON.stringify(input), JSON.stringify(saved), provider, createdAt);
    for (const v of versions) await db.prepare('INSERT INTO ai_versions (id, session_id, request_id, version_json, created_at) VALUES (?,?,?,?,?)')
      .run(v.id, sessionId, 'initial-' + v.candidateId, JSON.stringify(v), createdAt);
  });
  return { sessionId, input, candidates: saved, versions, provider, mock: provider === 'mock' };
}
export async function saveVersion(sessionId: string, requestId: string, version: ImageVersion): Promise<void> {
  await getDb().prepare('INSERT INTO ai_versions (id, session_id, request_id, version_json, created_at) VALUES (?,?,?,?,?)')
    .run(version.id, sessionId, requestId, JSON.stringify(version), version.createdAt);
}
