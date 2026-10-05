import { PNG } from 'pngjs';
import { badRequest } from '../../utils/http.js';
import type { RegionHint } from './types.js';

// Accept PNG bytes only: no arbitrary server-side URL fetching.
export function readPng(src: string): PNG {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);
  if (!match || src.length > 8_000_000) throw badRequest('사진은 6MB 이하의 PNG 이미지여야 합니다.');
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw badRequest('PNG 이미지가 올바르지 않습니다.');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 2048 || height > 2048) throw badRequest('사진 크기는 최대 2048×2048입니다.');
  try { return PNG.sync.read(bytes); } catch { throw badRequest('PNG 이미지를 읽을 수 없습니다.'); }
}
export function pngUrl(image: PNG): string { return 'data:image/png;base64,' + PNG.sync.write(image).toString('base64'); }
export function regionBounds(width: number, height: number, region: RegionHint | null) {
  if (!region) return { x: 0, y: 0, right: width, bottom: height };
  if (region.w <= 0 || region.h <= 0 || region.x < 0 || region.y < 0 || region.x + region.w > 1.000001 || region.y + region.h > 1.000001) throw badRequest('편집 영역이 이미지 범위를 벗어났습니다.');
  return { x: Math.floor(region.x * width), y: Math.floor(region.y * height),
    right: Math.min(width, Math.ceil((region.x + region.w) * width)), bottom: Math.min(height, Math.ceil((region.y + region.h) * height)) };
}
export function createMask(src: string, region: RegionHint | null): Buffer {
  const image = readPng(src), mask = new PNG({ width: image.width, height: image.height });
  mask.data.fill(255); // Opaque = protected; transparent = editable.
  const b = regionBounds(image.width, image.height, region);
  for (let y = b.y; y < b.bottom; y++) for (let x = b.x; x < b.right; x++) mask.data[(y * image.width + x) * 4 + 3] = 0;
  return PNG.sync.write(mask);
}
export function preserveOutside(baseUrl: string, editedUrl: string, region: RegionHint | null): string {
  const base = readPng(baseUrl), edited = readPng(editedUrl);
  if (base.width !== edited.width || base.height !== edited.height) throw Object.assign(new Error('편집 결과 이미지 크기가 달라졌습니다.'), { status: 502 });
  const b = regionBounds(base.width, base.height, region);
  for (let y = b.y; y < b.bottom; y++) {
    const start = (y * base.width + b.x) * 4, end = (y * base.width + b.right) * 4;
    edited.data.copy(base.data, start, start, end);
  }
  return pngUrl(base);
}
