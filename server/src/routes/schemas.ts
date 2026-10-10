import { z } from 'zod';

export const idParam = z.object({ id: z.string().min(1) });

export const preRegistrationBody = z.object({
  salonName: z.string().trim().min(1, '미용실 이름을 입력해주세요.').max(100)
    .transform(value => value.normalize('NFKC').replace(/\s+/g, ' ')),
  email: z.string().trim().max(254).email('이메일 주소를 확인해주세요.').transform(value => value.toLowerCase()),
  contactName: z.string().trim().max(50).optional(),
  region: z.string().trim().max(100).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: '개인정보 수집·이용에 동의해주세요.' }) }),
  website: z.literal('').optional(),
});

export const pagingQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(50).optional(),
});

const phone = z
  .string()
  .max(20)
  .regex(/^[0-9\-+() ]*$/, '전화번호 형식이 올바르지 않습니다.')
  .optional();

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.').optional();

export const loginBody = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(30),
  password: z.string().max(100).optional(),
});

export const registerBody = z.object({
  name: z.string().min(1).max(30),
  password: z.string().min(4).max(100),
});

export const customerQuery = pagingQuery.extend({
  sort: z.enum(['recent', 'name']).optional(),
});

export const customerBody = z.object({
  name: z.string().min(1, '고객 이름을 입력해주세요.').max(30),
  phone,
  lastVisit: dateStr,
});

export const customerPatchBody = z.object({
  name: z.string().min(1).max(30).optional(),
  phone: z.string().max(20).nullable().optional(),
  lastVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const imageStr = z.string().min(1).max(10_000_000);

export const presetQuery = pagingQuery.extend({
  category: z.string().max(20).optional(),
});

export const presetBody = z.object({
  name: z.string().min(1, '프리셋 이름을 입력해주세요.').max(30),
  desc: z.string().max(60).optional(),
  category: z.string().max(20).optional(),
  length: z.string().max(20).optional(),
  bang: z.string().max(20).optional(),
  perm: z.string().max(20).optional(),
  color: z.string().max(20).optional(),
  memo: z.string().max(300).optional(),
  refImages: z.array(imageStr).max(5).optional(),
});

export const presetPatchBody = presetBody.partial();

const conditionSchema = z
  .object({
    damage: z.string().max(10),
    texture: z.string().max(10),
    thickness: z.string().max(10),
    density: z.string().max(10),
    elasticity: z.string().max(10),
    feel: z.string().max(10),
  })
  .nullable()
  .optional();

export const recordQuery = pagingQuery.extend({
  customerId: z.string().max(64).optional(),
});

export const stylistReviewSchema = z.object({
  versionId: z.string().min(1).max(64),
  possible: z.enum(['가능', '조건부 가능', '어려움']),
  curl: z.enum(['약', '중', '강']), sideControl: z.enum(['자연스럽게', '다운', '볼륨 유지']),
  notes: z.array(z.string().min(1).max(100)).max(10), memo: z.string().max(1000),
}).superRefine((review, ctx) => {
  if (review.possible !== '가능' && !review.memo.trim())
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memo'], message: '시술 조건 또는 어려운 이유를 메모에 입력해주세요.' });
});

export const recordBody = z.object({
  customerId: z.string().max(64).optional(),
  customerName: z.string().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  styleName: z.string().max(50).optional(),
  views: z.object({ front: imageStr, side: imageStr, back: imageStr }),
  intent: z.string().max(200).optional(),
  adjustments: z.array(z.string().max(100)).max(20).optional(),
  condition: conditionSchema,
  sessionId: z.string().max(64).optional(),
  selectedVersionId: z.string().max(64).optional(),
  stylistReview: stylistReviewSchema.optional(),
});

const regionSchema = z
  .object({
    id: z.string().max(64),
    type: z.enum(['fringe', 'side', 'crown', 'back', 'all']),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().gt(0).max(1),
    h: z.number().gt(0).max(1),
    label: z.string().max(20),
  })
  .nullable();

const pngImage = z.string().min(1).max(8_000_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, 'PNG 사진을 첨부해주세요.');
const settingsShape = {
  bang: z.number().min(0).max(100),
  sideLength: z.number().min(0).max(100),
  sideHair: z.string().max(30),
  condition: z.object({
    damage: z.enum(['건강','건조','손상','극손상']), texture: z.enum(['직모','반곱슬','곱슬']),
    thickness: z.enum(['가늘음','보통','굵음']), density: z.enum(['낮음','보통','높음']),
    elasticity: z.enum(['낮음','보통','높음']), feel: z.enum(['부드러움','보통','거침']),
  }),
};
export const aiGenerateBody = z.object({
  requestId: z.string().min(1).max(64),
  prompt: z.string().max(500).optional(), presetId: z.string().max(64).optional(),
  customerName: z.string().min(1).max(30), intent: z.string().min(1).max(200),
  photos: z.object({ front: pngImage, side: pngImage, back: pngImage }),
  preset: presetBody.extend({ id: z.string().min(1).max(64), desc: z.string().max(60), refImages: z.array(pngImage).max(2).optional() }),
  ...settingsShape,
});

export const aiEditBody = z.object({
  requestId: z.string().min(1).max(64), sessionId: z.string().min(1).max(64), baseVersionId: z.string().min(1).max(64),
  view: z.enum(['front','side','back']), region: regionSchema,
  feedback: z.array(z.string().max(100)).max(20), freeText: z.string().max(500),
  ...settingsShape,
});
