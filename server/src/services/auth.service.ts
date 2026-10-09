import bcrypt from 'bcryptjs';
import { getDb, transaction } from '../db/database.js';
import { config } from '../config.js';
import { badRequest, unauthorized } from '../utils/http.js';
import { signToken } from '../utils/jwt.js';
import { createDesigner, findDesignerById, findDesignerByName, toPublicDesigner, type PublicDesigner } from '../repositories/designer.repo.js';

/**
 * Auth Service.
 * - AUTH_PROVIDER=mock (기본): 이름만으로 로그인. 디자이너가 없으면 DB에 자동 생성 후 JWT 발급.
 *   → 키 없이도 로그인→보호 API까지 전체 흐름 테스트 가능, Mock 사용자도 실제 DB와 연결됨.
 * - AUTH_PROVIDER=real: 비밀번호 필수. POST /api/auth/register로 먼저 가입.
 * 프론트 인터페이스(POST /api/auth/login)는 모드에 관계없이 동일.
 */
export async function login(input: { name: string; password?: string }): Promise<{ token: string; designer: PublicDesigner }> {
  const name = input.name?.trim();
  if (!name) throw badRequest('이름을 입력해주세요.');
  if (name.length > 30) throw badRequest('이름은 30자 이내로 입력해주세요.');
  const db = getDb();

  if (config.authProvider === 'real') {
    if (!input.password) throw badRequest('비밀번호를 입력해주세요.');
    const row = (await findDesignerByName(name, db));
    if (!row || !row.password_hash) throw unauthorized('존재하지 않는 사용자이거나 비밀번호가 필요합니다.');
    const ok = await bcrypt.compare(input.password, row.password_hash);
    if (!ok) throw unauthorized('이름 또는 비밀번호가 올바르지 않습니다.');
    return { token: signToken({ sub: row.id, name: row.name }), designer: toPublicDesigner(row) };
  }

  const row = await transaction(async tx => {
    await tx.lock('designer:' + name);
    return await findDesignerByName(name, tx) ?? await createDesigner(name, null, tx);
  });
  return { token: signToken({ sub: row.id, name: row.name }), designer: toPublicDesigner(row) };
}

export async function register(input: { name: string; password: string }): Promise<{ token: string; designer: PublicDesigner }> {
  const name = input.name?.trim();
  if (!name) throw badRequest('이름을 입력해주세요.');
  if (!input.password || input.password.length < 4) throw badRequest('비밀번호는 4자 이상 입력해주세요.');
  const hash = await bcrypt.hash(input.password, 10);
  const row = await transaction(async tx => {
    await tx.lock('designer:' + name);
    if (await findDesignerByName(name, tx)) throw badRequest('이미 등록된 이름입니다.');
    return createDesigner(name, hash, tx);
  });
  return { token: signToken({ sub: row.id, name: row.name }), designer: toPublicDesigner(row) };
}

export async function me(designerId: string): Promise<PublicDesigner> {
  const row = (await findDesignerById(designerId, getDb()));
  if (!row) throw unauthorized('사용자를 찾을 수 없습니다.');
  return toPublicDesigner(row);
}
