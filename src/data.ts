export const PRESETS = [
  { id: 'dandy', name: '댄디', desc: '깔끔한 옆가르마', seed: 'hairdandy' },
  { id: 'seethrough', name: '시스루뱅', desc: '가벼운 앞머리', seed: 'hairsee' },
  { id: 'part', name: '가르마', desc: '자연스러운 6:4', seed: 'hairpart' },
  { id: 'regent', name: '리젠트', desc: '클래식 볼륨', seed: 'hairregent' },
  { id: 'layered', name: '레이어드', desc: '가벼운 층', seed: 'hairlayer' },
  { id: 'hush', name: '허쉬', desc: '내추럴 볼륨', seed: 'hairhush' },
  { id: 'bob', name: '보브', desc: '단정한 턱선', seed: 'hairbob' },
  { id: 'wave', name: '내추럴 웨이브', desc: '부드러운 곡선', seed: 'hairwave' }
];
export const img = (seed: string, n = 600) => `https://picsum.photos/seed/${seed}/${n}/${Math.round(n * 1.15)}`;
export const QUICK_NOTES = ['모발 손상 있음', '다운펌 필요', '앞머리 길이 유지', '볼륨 조정', '시술 난이도 높음'];

// 앞머리 슬라이더(0~100)를 구체적인 길이로 변환. 45 = 눈썹선 기준, 10 = 1cm
export function bangLabel(v: number): string {
  const cm = Math.round(((v - 45) / 10) * 2) / 2;
  if (Math.abs(cm) < 0.5) return '눈썹선';
  const t = `${Math.abs(cm)}cm`.replace('.5cm', '.5cm');
  return cm < 0 ? `눈썹 위 ${t}` : `눈썹 아래 ${t}`;
}
// 가운데(45) = 눈썹선 기준, 10 = 1cm. 위로 올리면 눈썹 위, 내리면 눈썹 아래 (최대 ±3cm)
export const BANG_QUICK = [
  { label: '눈썹 위 3cm', v: 15 },
  { label: '눈썹 위 1.5cm', v: 30 },
  { label: '눈썹선', v: 45 },
  { label: '눈썹 아래 1.5cm', v: 60 },
  { label: '눈썹 아래 3cm', v: 75 }
];

// 옆머리 슬라이더(0~100)를 구체적인 길이로 변환. 50 = 귓볼선 기준, 10 = 1cm
export function sideLabel(v: number): string {
  const cm = Math.round(((v - 50) / 10) * 2) / 2;
  if (Math.abs(cm) < 0.5) return '귓볼선';
  const t = `${Math.abs(cm)}cm`;
  return cm < 0 ? `귓볼 위 ${t}` : `귓볼 아래 ${t}`;
}
// 가운데(50) = 귓볼선 기준, 10 = 1cm. 위로 올리면 짧게(귓볼 위), 아래로 내리면 길게(귓볼 아래)
export const SIDE_QUICK = [
  { label: '귓볼 위 3cm', v: 20 },
  { label: '귓볼 위 1.5cm', v: 35 },
  { label: '귓볼선', v: 50 },
  { label: '귓볼 아래 1.5cm', v: 65 },
  { label: '귓볼 아래 3cm', v: 80 }
];

// 기장 가이드선 색상 (앞머리=보라 / 옆머리=연보라)
export const FRINGE_LINE_COLOR = '#7C3AED';
export const SIDE_LINE_COLOR = '#A78BFA';
