import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { DIRECTIONS, editSummary } from './prompts.js';
import { createMask, pngUrl, readPng } from './png.js';
import { VIEW_KEYS, type EditInput, type GenerateInput, type ImageProvider, type TriView } from './types.js';

function mockImage(source: string, seed: string, mask?: Buffer): string {
  const image = readPng(source), hash = createHash('sha256').update(seed).digest();
  const m = mask ? PNG.sync.read(mask) : null;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const p = (y * image.width + x) * 4;
    const editable = m ? m.data[p + 3] === 0 : y < image.height * .5 && x > image.width * .2 && x < image.width * .8;
    if (editable) {
      for (let channel = 0; channel < 3; channel++) image.data[p + channel] = Math.round(image.data[p + channel] * .65 + hash[channel] * .35);
      image.data[p + 3] = 255;
    }
  }
  return pngUrl(image);
}
// Offline PNGs exercise the same photo, mask and returned-image contract.
export class MockImageProvider implements ImageProvider {
  readonly kind = 'mock' as const;
  async generate(input: GenerateInput) {
    if (input.prompt?.includes('__fail__')) throw Object.assign(new Error('목업 생성 오류'), { status: 502 });
    const context = JSON.stringify({ ...input, requestId: undefined });
    const candidates = DIRECTIONS.map(d => {
      const views = {} as TriView;
      for (const view of VIEW_KEYS) views[view] = mockImage(input.photos[view], context + d.id);
      return { id: d.id, name: d.name, desc: d.desc, views };
    });
    return { candidates, mock: true };
  }
  async edit(input: EditInput) {
    if (input.freeText.includes('__fail__')) throw Object.assign(new Error('목업 편집 오류'), { status: 502 });
    const views = {} as TriView, seed = editSummary(input);
    for (const view of VIEW_KEYS) views[view] = mockImage(input.views[view], seed,
      view === input.view ? createMask(input.views[view], input.region) : undefined);
    return { views, mock: true, summary: editSummary(input) };
  }
}
