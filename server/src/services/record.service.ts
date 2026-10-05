import { getDb, transaction } from '../db/database.js';
import { badRequest, notFound, conflict, pageMeta, parsePaging } from '../utils/http.js';
import * as repo from '../repositories/record.repo.js';
import { findCustomerByName } from '../repositories/customer.repo.js';
import { findSession } from '../repositories/ai.repo.js';

function assertRecordInput(input: repo.RecordInput): void {
  if (!input.customerName?.trim()) throw badRequest('고객 이름을 입력해주세요.');
  if (!input.views || typeof input.views.front !== 'string' || !input.views.front) {
    throw badRequest('상담 이미지(앞/옆/뒤)가 필요합니다.');
  }
  for (const k of ['front', 'side', 'back'] as const) {
    const v = input.views[k];
    if (typeof v !== 'string' || v.length === 0 || v.length > 10_000_000) {
      throw badRequest('상담 이미지 형식이 올바르지 않습니다.');
    }
  }
  if (input.styleName !== undefined && input.styleName.length > 50) throw badRequest('스타일 이름이 너무 깁니다.');
  if (input.intent !== undefined && input.intent.length > 200) throw badRequest('의향 내용이 너무 깁니다.');
  if (input.adjustments !== undefined) {
    if (!Array.isArray(input.adjustments) || input.adjustments.length > 20) throw badRequest('조정 기록 형식이 올바르지 않습니다.');
  }
}

export function listRecords(designerId: string, q: Record<string, unknown>) {
  const { page, limit } = parsePaging(q);
  const search = String(q.search ?? '').trim();
  const customerId = String(q.customerId ?? '').trim();
  const db = getDb();
  const total = repo.countRecords(designerId, { search, customerId }, db);
  const rows = repo.listRecords(designerId, { search, customerId, page, limit }, db);
  return { items: rows.map(repo.toPublicRecord), meta: pageMeta(page, limit, total) };
}

export function getRecord(designerId: string, id: string) {
  const row = repo.findRecord(designerId, id, getDb());
  if (!row) throw notFound('상담 기록을 찾을 수 없습니다.');
  return repo.toPublicRecord(row);
}

/** 상담 완료: 기록 저장 + 고객 통계 갱신을 한 트랜잭션으로 처리 */
export function createRecord(designerId: string, input: repo.RecordInput) {
  if (input.sessionId || input.selectedVersionId) {
    if (!input.sessionId || !input.selectedVersionId) throw badRequest('상담 세션과 선택 버전이 필요합니다.');
    const session = findSession(designerId, input.sessionId);
    const selected = session?.versions.find(v => v.id === input.selectedVersionId);
    if (!session || !selected) throw notFound('선택한 상담 버전을 찾을 수 없습니다.');
    const prior = getDb().prepare('SELECT * FROM consultation_records WHERE ai_session_id = ? AND designer_id = ? AND deleted_at IS NULL').get(input.sessionId, designerId) as repo.RecordRow | undefined;
    if (prior) {
      if (prior.selected_version_id !== input.selectedVersionId) throw conflict('이미 다른 버전으로 완료한 상담입니다.');
      return repo.toPublicRecord(prior);
    }
    const candidate = session.candidates.find(c => c.id === selected.candidateId)!;
    input = { ...input, views: selected.views, styleName: candidate.name, condition: selected.settings.condition,
      customerName: session.input.customerName, intent: session.input.intent };
  }
  assertRecordInput(input);
  const row = transaction((db) =>
    repo.createRecordTx(
      designerId,
      { ...input, customerName: input.customerName.trim() },
      db,
      (dId, name, d) => findCustomerByName(dId, name, d)?.id ?? null
    )
  );
  return repo.toPublicRecord(row);
}

export function deleteRecord(designerId: string, id: string) {
  const { softDeleteRecord } = repo;
  const ok = softDeleteRecord(designerId, id, getDb());
  if (!ok) throw notFound('상담 기록을 찾을 수 없습니다.');
}
