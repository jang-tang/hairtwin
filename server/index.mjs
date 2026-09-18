import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 8787);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const storageRoot = path.resolve(process.env.STORAGE_DIR || './server/storage');
const uploadsDir = path.join(storageRoot, 'uploads');
const generatedDir = path.join(storageRoot, 'generated');
const reportsFile = path.join(storageRoot, 'reports.json');
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-5-nano';

await fs.mkdir(uploadsDir, { recursive: true });
await fs.mkdir(generatedDir, { recursive: true });
try { await fs.access(reportsFile); } catch { await fs.writeFile(reportsFile, '[]', 'utf8'); }

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use('/media', express.static(storageRoot));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(png|jpe?g|webp)$/i.test(file.mimetype));
  },
});

function safeId(value) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error('Invalid asset id');
  return value;
}

function assetPathFromId(id) {
  const safe = safeId(id);
  const candidate = [path.join(uploadsDir, safe), path.join(generatedDir, safe)];
  return candidate;
}

async function resolveAsset(id) {
  const candidates = assetPathFromId(id);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error(`Asset not found: ${id}`);
}

function publicMediaUrl(fileName) {
  return `/media/${fileName.replaceAll('\\', '/')}`;
}

async function saveGeneratedImage(base64, prefix = 'image') {
  const id = `${prefix}-${crypto.randomUUID()}.png`;
  await fs.writeFile(path.join(generatedDir, id), Buffer.from(base64, 'base64'));
  return { id, url: publicMediaUrl(`generated/${id}`) };
}

async function loadReports() {
  return JSON.parse(await fs.readFile(reportsFile, 'utf8'));
}

async function saveReports(reports) {
  await fs.writeFile(reportsFile, JSON.stringify(reports, null, 2), 'utf8');
}

async function buildMask(sourcePath, regions) {
  if (!regions?.length) return null;
  const meta = await sharp(sourcePath).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const rects = regions.map((r) => {
    const x = Math.max(0, Math.min(width, Math.round(r.x * width)));
    const y = Math.max(0, Math.min(height, Math.round(r.y * height)));
    const w = Math.max(1, Math.min(width - x, Math.round(r.width * width)));
    const h = Math.max(1, Math.min(height - y, Math.round(r.height * height)));
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black" fill-opacity="0" />`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="black" fill-opacity="1"/>${rects}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function candidatePlans(selectedPreset, intent) {
  const base = selectedPreset || 'Clean, natural salon style';
  return [
    { title: selectedPreset || 'Soft See-through', modifier: 'lighter and softer around the fringe, airy silhouette' },
    { title: intent === 'new' ? 'Modern Layered' : 'Clean Dandy', modifier: 'cleaner contour, controlled side volume, polished finish' },
    { title: 'Natural Texture', modifier: 'more natural texture, relaxed movement, soft transitions' },
  ].map((x) => ({ ...x, base }));
}

function bangLengthLabel(value) {
  const n = Number(value ?? 50);
  if (n < 28) return '눈썹 위';
  if (n < 45) return '눈썹 위 살짝';
  if (n < 62) return '눈썹 위치';
  if (n < 84) return '눈썹 아래';
  return '길게';
}

function imagePrompt({ plan, view, hairCondition, intent, bangLength }) {
  const condition = JSON.stringify(hairCondition || {});
  return [
    'Create a photorealistic salon consultation visualization of the SAME REAL CUSTOMER shown in the reference photos.',
    'Preserve the person identity, face shape, facial proportions, skin tone, age appearance, and overall head geometry as faithfully as possible.',
    'Use all reference views as geometry references: front is the identity anchor, side controls side profile and side-hair behavior, back controls back volume and silhouette.',
    `Render the ${view} view only, with the customer facing the correct direction for that view.`,
    `Desired style family: ${plan.title}. Variation: ${plan.modifier}. Base direction: ${plan.base}.`,
    `Customer intent: ${intent}. Bang length: ${bangLengthLabel(bangLength)}.`,
    `Hair condition and characteristics: ${condition}.`,
    'Keep the scene neutral and premium like a high-end salon consultation reference. Do not add text, labels, logos, accessories, jewelry, or extra people.',
    'The hairstyle must look physically plausible for the stated hair characteristics. Keep the same person and same overall facial appearance across outputs.',
  ].join(' ');
}

async function requireOpenAI() {
  if (!openai) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. server/.env를 확인하세요.');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openaiConfigured: Boolean(openai), imageModel, textModel });
});

app.post('/api/uploads', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const id = `${crypto.randomUUID()}.${ext}`;
    await fs.writeFile(path.join(uploadsDir, id), req.file.buffer);
    res.json({ id, url: publicMediaUrl(`uploads/${id}`), source: 'upload' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '업로드 실패' });
  }
});

app.post('/api/ai/generate-candidates', async (req, res) => {
  try {
    await requireOpenAI();
    const { frontId, sideId, backId, intent, selectedStylePreset, hairCondition, bangsLength } = req.body || {};
    if (!frontId || !sideId || !backId || !hairCondition) return res.status(400).json({ error: '3면 사진과 모발 상태가 필요합니다.' });

    const inputEntries = await Promise.all([frontId, sideId, backId].map(async (id) => ({ path: await resolveAsset(id), id })));
    const inputPaths = inputEntries.map((entry) => entry.path);

    const plans = candidatePlans(selectedStylePreset, intent).slice(0, 1);
    const views = ['front', 'side', 'back'];
    const candidates = [];

    for (const plan of plans) {
      const outputs = {};
      for (const view of views) {
        const files = await Promise.all(inputPaths.map(async (p) => { const ext = path.extname(p).toLowerCase(); const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'; return toFile(await fs.readFile(p), path.basename(p), { type }); }));
        const response = await openai.images.edit({
          model: imageModel,
          image: files,
          prompt: imagePrompt({ plan, view, hairCondition, intent, bangLength: Number(bangsLength ?? 64) }),
          n: 1,
          quality: 'medium',
          size: '1024x1024',
          output_format: 'png',
        });
        const generated = response.data?.[0]?.b64_json;
        if (!generated) throw new Error(`OpenAI 이미지 생성 결과가 비어 있습니다. (${plan.title}/${view})`);
        const saved = await saveGeneratedImage(generated, `${plan.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${view}`); outputs[view] = saved;
      }
      candidates.push({
        id: crypto.randomUUID(),
        title: plan.title,
        description: `${plan.modifier}. 고객의 현재 모발 특성을 고려한 상담용 시각화입니다.`,
        frontImage: outputs.front.url,
        sideImage: outputs.side.url,
        backImage: outputs.back.url,
        frontImageId: outputs.front.id,
        sideImageId: outputs.side.id,
        backImageId: outputs.back.id,
        tags: ['AI', plan.modifier],
      });
    }
    res.json({ candidates, model: imageModel });
  } catch (error) {
    console.error(error);
    const status = error?.status === 429 || error?.code === 'rate_limit_exceeded' ? 429 : 500;
    const retryAfter = error?.headers?.get?.('retry-after') ?? undefined;
    if (status === 429 && retryAfter) res.setHeader('Retry-After', retryAfter);
    res.status(status).json({
      error: status === 429
        ? `AI 이미지 생성 한도에 도달했습니다. 약 ${retryAfter ?? '몇'}초 후 다시 시도해주세요.`
        : (error instanceof Error ? error.message : 'AI 이미지 생성 실패'),
    });
  }
});

app.post('/api/ai/interpret-feedback', async (req, res) => {
  try {
    await requireOpenAI();
    const { feedbackText, selectedRegions = [], hairAttributes } = req.body || {};
    if (!feedbackText?.trim()) return res.status(400).json({ error: '고객 요청이 필요합니다.' });

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        adjustments: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string' },
              amount: { type: 'number' },
              detail: { type: 'string' },
            },
            required: ['label', 'amount', 'detail'],
          },
        },
      },
      required: ['summary', 'adjustments'],
    };

    const response = await openai.responses.create({
      model: textModel,
      input: [
        {
          role: 'system',
          content: 'You are a professional salon consultation interpreter. Convert natural customer feedback into concise, actionable hairstyle adjustments. Do not diagnose medical conditions. Return Korean text.',
        },
        {
          role: 'user',
          content: JSON.stringify({ feedbackText, selectedRegions, hairAttributes }),
        },
      ],
      text: { format: { type: 'json_schema', name: 'feedback_interpretation', strict: true, schema } },
    });

    res.json(JSON.parse(response.output_text));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI 해석 실패' });
  }
});

app.post('/api/ai/edit-style', async (req, res) => {
  try {
    await requireOpenAI();
    const body = JSON.parse(req.body.payload || '{}');
    const { frontId, sideId, backId, feedbackText, selectedRegions = [], bangLength, hairAttributes } = body;
    if (!frontId || !sideId || !backId) return res.status(400).json({ error: '편집할 3면 이미지가 필요합니다.' });

    const inputIds = [frontId, sideId, backId];
    const inputPaths = await Promise.all(inputIds.map(resolveAsset));
    const outputs = {};
    for (const [idx, view] of ['front', 'side', 'back'].entries()) {
      const sourcePath = inputPaths[idx];
      const imageBuffer = await fs.readFile(sourcePath);
      const ext = path.extname(sourcePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const files = [await toFile(imageBuffer, path.basename(sourcePath), { type: mime })];
      const maskBuffer = await buildMask(sourcePath, selectedRegions.filter((r) => r.view == null || r.view === view));
      const prompt = [
        'Edit the same real customer hairstyle while preserving identity and face.',
        `Customer feedback: ${feedbackText || 'Make the style more natural and cohesive.'}`,
        `Bang length 0-100: ${bangLength ?? 64}. Hair attributes: ${JSON.stringify(hairAttributes || {})}.`,
        `Current view: ${view}. Maintain consistent hairstyle geometry with the other customer reference photos.`,
        'Only alter the requested hairstyle areas. Keep lighting, camera angle, skin, facial features, and background stable. Do not add text or accessories.',
      ].join(' ');
      const response = await openai.images.edit({
        model: imageModel,
        image: files,
        ...(maskBuffer ? { mask: await toFile(maskBuffer, 'mask.png', { type: 'image/png' }) } : {}),
        prompt,
        n: 1,
        quality: 'medium',
        size: '1024x1024',
        output_format: 'png',
      });
      const generated = response.data?.[0]?.b64_json;
      if (!generated) throw new Error(`OpenAI 이미지 편집 결과가 비어 있습니다. (${view})`);
      outputs[view] = await saveGeneratedImage(generated, `edit-${view}`);
    }
    res.json({ frontImage: outputs.front.url, sideImage: outputs.side.url, backImage: outputs.back.url, frontImageId: outputs.front.id, sideImageId: outputs.side.id, backImageId: outputs.back.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI 이미지 편집 실패' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const report = req.body;
    if (!report?.id || !report?.customerId || !report?.finalStyle) return res.status(400).json({ error: '리포트 필수 값이 없습니다.' });
    const reports = await loadReports();
    const next = [...reports.filter((item) => item.id !== report.id), report];
    await saveReports(next);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '리포트 저장 실패' });
  }
});

app.get('/api/reports', async (_req, res) => {
  res.json(await loadReports());
});

app.listen(port, () => {
  console.log(`Hair Twin API listening on http://localhost:${port}`);
  console.log(`OpenAI configured: ${Boolean(openai)} | image=${imageModel} | text=${textModel}`);
});
