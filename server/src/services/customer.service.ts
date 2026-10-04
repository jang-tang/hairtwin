import { getDb, transaction } from '../db/database.js';
import { badRequest, notFound } from '../utils/http.js';
import { pageMeta, parsePaging } from '../utils/http.js';
import * as repo from '../repositories/customer.repo.js';
import { findCustomerByName } from '../repositories/customer.repo.js';

export function listCustomers(designerId: string, q: Record<string, unknown>) {
  const { page, limit } = parsePaging(q);
  const search = String(q.search ?? '').trim();
  const sort = q.sort === 'name' ? 'name' : 'recent';
  const db = getDb();
  const total = repo.countCustomers(designerId, search, db);
  const rows = repo.listCustomers(designerId, { search, page, limit, sort: sort as 'recent' | 'name' }, db);
  return { items: rows.map(repo.toPublicCustomer), meta: pageMeta(page, limit, total) };
}

export function getCustomer(designerId: string, id: string) {
  const row = repo.findCustomer(designerId, id, getDb());
  if (!row) throw notFound('고객을 찾을 수 없습니다.');
  return repo.toPublicCustomer(row);
}

export function createCustomer(designerId: string, input: { name: string; phone?: string; lastVisit?: string }) {
  const name = input.name?.trim();
  if (!name) throw badRequest('고객 이름을 입력해주세요.');
  const db = getDb();
  if (findCustomerByName(designerId, name, db)) throw badRequest('이미 등록된 고객입니다.');
  return repo.toPublicCustomer(repo.createCustomer(designerId, { name, phone: input.phone, lastVisit: input.lastVisit }, db));
}

export function updateCustomer(designerId: string, id: string, input: { name?: string; phone?: string | null; lastVisit?: string | null }) {
  if (input.name !== undefined && !input.name.trim()) throw badRequest('고객 이름은 비울 수 없습니다.');
  const row = transaction((db) => repo.updateCustomer(designerId, id, input, db));
  if (!row) throw notFound('고객을 찾을 수 없습니다.');
  return repo.toPublicCustomer(row);
}

export function deleteCustomer(designerId: string, id: string) {
  const ok = repo.softDeleteCustomer(designerId, id, getDb());
  if (!ok) throw notFound('고객을 찾을 수 없습니다.');
}
