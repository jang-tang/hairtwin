// 오프라인 목업 이미지 엔진 (API 키 없이 전체 상담 흐름 체험용)
// VITE_MOCK_AI=false 로 바꾸면 실제 picsum/서버 이미지 경로로 전환됩니다.
// SVG data-URL 기반이라 네트워크 없이도 결정적(deterministic)으로 렌더됩니다.
import type { TriView } from '../types';

export function isMockMode(): boolean {
  const v = import.meta.env.VITE_MOCK_AI as string | undefined;
  return v !== 'false';
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const HAIR_COLORS = ['#3B2A24', '#5A3A2E', '#2A2A2E', '#6B4A35'];
const VIEW_LABEL: Record<string, string> = { front: '앞', side: '옆', back: '뒤' };

// 해시값에 따라 4가지 헤어 실루엣 중 하나를 선택 (앞/옆/뒤 변형 포함)
function hairPath(variant: number, view: string): string {
  if (view === 'side') {
    return [
      'M300 90 C 200 90 175 190 185 300 L 195 470 C 230 430 240 350 235 280 C 260 250 340 245 365 280 C 380 350 375 430 360 470 L 415 300 C 425 190 400 90 300 90 Z',
      'M300 90 C 210 90 180 180 190 290 L 150 470 L 230 470 C 250 380 245 300 250 260 C 280 240 340 245 360 275 C 375 350 370 430 365 470 L 450 470 L 410 290 C 420 180 390 90 300 90 Z'
    ][variant % 2];
  }
  if (view === 'back') {
    return [
      'M300 85 C 195 85 170 195 180 310 L 190 500 C 260 480 270 400 268 320 L 332 320 C 330 400 340 480 410 500 L 420 310 C 430 195 405 85 300 85 Z',
      'M300 85 C 205 85 175 185 185 300 L 160 430 C 240 470 360 470 440 430 L 415 300 C 425 185 395 85 300 85 Z'
    ][variant % 2];
  }
  return [
    'M300 85 C 205 85 178 185 188 295 C 195 350 200 400 195 450 L 240 450 C 245 380 242 320 248 290 C 270 270 330 270 352 290 C 358 320 355 380 360 450 L 405 450 C 400 400 405 350 412 295 C 422 185 395 85 300 85 Z',
    'M300 85 C 200 85 175 190 190 300 L 175 480 C 260 500 340 500 425 480 L 410 300 C 425 190 400 85 300 85 Z',
    'M300 85 C 210 85 185 175 195 270 C 230 250 370 250 405 270 C 415 175 390 85 300 85 Z M210 280 C 205 360 200 430 195 480 L 250 480 C 255 400 253 330 258 295 Z M342 295 C 347 330 345 400 350 480 L 405 480 C 400 430 395 360 390 280 Z'
  ][variant % 3];
}

export function mockPortrait(seed: string, view: 'front' | 'side' | 'back', title: string, sub = ''): string {
  const h = hashSeed(seed + view);
  const variant = h % 3;
  const hair = HAIR_COLORS[h % HAIR_COLORS.length];
  const bangH = 150 + ((h >> 3) % 60); // 앞머리 길이 시각 차이
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="690" viewBox="0 0 600 690">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7F8"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>` +
    `<rect width="600" height="690" fill="url(#bg)"/>` +
    `<circle cx="300" cy="300" r="225" fill="none" stroke="#FF4A5D" stroke-opacity="0.18" stroke-width="3"/>` +
    `<circle cx="300" cy="300" r="180" fill="none" stroke="#FF4A5D" stroke-opacity="0.1" stroke-width="2"/>` +
    // 어깨
    `<path d="M150 690 C 160 560 220 520 300 520 C 380 520 440 560 450 690 Z" fill="#F4D9CE"/>` +
    // 얼굴
    `<ellipse cx="300" cy="330" rx="105" ry="130" fill="#F8E3D6"/>` +
    // 헤어
    `<path d="${hairPath(variant, view)}" fill="${hair}"/>` +
    // 앞머리 (길이 변화를 시각적으로 표현)
    (view === 'front'
      ? `<path d="M205 210 C 250 ${bangH} 350 ${bangH} 395 210 L 395 250 C 350 ${bangH + 40} 250 ${bangH + 40} 205 250 Z" fill="${hair}"/>`
      : '') +
    // view 라벨
    `<rect x="24" y="24" width="76" height="52" rx="26" fill="#FF4A5D"/>` +
    `<text x="62" y="60" font-size="30" font-weight="bold" fill="#fff" text-anchor="middle" font-family="sans-serif">${VIEW_LABEL[view]}</text>` +
    // 목업 리본
    `<rect x="420" y="24" width="156" height="44" rx="22" fill="#18181B" fill-opacity="0.75"/>` +
    `<text x="498" y="53" font-size="22" fill="#fff" text-anchor="middle" font-family="sans-serif">목업</text>` +
    // 타이틀
    `<rect x="60" y="560" width="480" height="96" rx="20" fill="#FFFFFF" stroke="#E4E4E7"/>` +
    `<text x="300" y="600" font-size="30" font-weight="bold" fill="#18181B" text-anchor="middle" font-family="sans-serif">${title}</text>` +
    (sub ? `<text x="300" y="632" font-size="22" fill="#71717A" text-anchor="middle" font-family="sans-serif">${sub}</text>` : '') +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function mockTriView(seedBase: string, title: string, sub = ''): TriView {
  return {
    front: mockPortrait(seedBase, 'front', title, sub),
    side: mockPortrait(seedBase, 'side', title, sub),
    back: mockPortrait(seedBase, 'back', title, sub)
  };
}
