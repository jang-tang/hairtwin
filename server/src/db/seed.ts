import { getDb, transaction } from './database.js';
import { createDesigner, findDesignerByName } from '../repositories/designer.repo.js';
import { createCustomer, findCustomerByName } from '../repositories/customer.repo.js';
import { createPreset } from '../repositories/preset.repo.js';
import type { DatabaseSync } from 'node:sqlite';

/**
 * 데모 시드: 프론트 기존 mock(ht-dash 시드 고객 2명, 시그니처 프리셋 1개)을
 * 실제 DB 관계에 맞게 생성. 멱등 — 이미 있으면 건너뜀.
 * `npm run seed` 또는 서버 기동 시 SEED_DEMO=true면 자동 실행.
 */
export function runSeed(db: DatabaseSync = getDb()): void {
  transaction((tx) => {
    let designer = findDesignerByName('지수 디자이너', tx);
    if (!designer) designer = createDesigner('지수 디자이너', null, tx);

    if (!findCustomerByName(designer.id, '김민지', tx)) {
      createCustomer(designer.id, { name: '김민지', phone: '010-1234-5678', lastVisit: '2026-09-20' }, tx);
      const c = findCustomerByName(designer.id, '김민지', tx)!;
      tx.prepare('UPDATE customers SET history_count = 3 WHERE id = ?').run(c.id);
    }
    if (!findCustomerByName(designer.id, '박서연', tx)) {
      createCustomer(designer.id, { name: '박서연', phone: '010-2222-3333', lastVisit: '2026-09-25' }, tx);
      const c = findCustomerByName(designer.id, '박서연', tx)!;
      tx.prepare('UPDATE customers SET history_count = 1 WHERE id = ?').run(c.id);
    }

    const hasPreset = tx.prepare('SELECT COUNT(*) AS c FROM presets WHERE designer_id = ? AND deleted_at IS NULL').get(designer.id) as {
      c: number;
    };
    if (hasPreset.c === 0) {
      createPreset(
        designer.id,
        {
          name: '지수쌤 시그니처 레이어드',
          desc: '가볍고 자연스러운 옆라인',
          category: '레이어드',
          length: '미디움',
          bang: '시스루뱅',
          perm: '볼륨펌',
          color: '염색 없음',
          memo: '옆머리 자연스럽게, 앞머리 눈썹선 기준',
          refImages: [],
        },
        tx
      );
    }
  });
  // eslint-disable-next-line no-console
  console.log('[seed] demo data ready');
}

// 직접 실행용: npm run seed
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
