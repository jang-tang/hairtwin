import { z } from 'zod';

export const idParam = z.object({ id: z.string().min(1) });

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

export const recordBody = z.object({
  customerId: z.string().max(64).optional(),
  customerName: z.string().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  styleName: z.string().max(50).optional(),
  views: z.object({ front: imageStr, side: imageStr, back: imageStr }),
  intent: z.string().max(200).optional(),
  adjustments: z.array(z.string().max(100)).max(20).optional(),
  condition: conditionSchema,
});

const regionSchema = z
  .object({
    id: z.string().max(64),
    type: z.string().max(16),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
    label: z.string().max(20),
  })
  .nullable();

export const aiGenerateBody = z.object({
  prompt: z.string().max(500).optional(),
  presetId: z.string().max(64).optional(),
  customerName: z.string().max(30).optional(),
});

export const aiEditBody = z.object({
  image: imageStr,
  region: regionSchema.optional(),
  bang: z.number().min(0).max(100),
  sideLength: z.number().min(0).max(100).optional(),
  sideHair: z.string().max(30).optional(),
  condition: z.unknown().optional(),
  feedback: z.array(z.string().max(100)).max(20).optional(),
});
