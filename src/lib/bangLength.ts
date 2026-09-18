export const BANG_QUICK_PRESETS = [
  { value: 18, label: '눈썹 위', helper: '눈썹이 드러나는 짧은 길이' },
  { value: 38, label: '눈썹 위 살짝', helper: '가볍게 이마가 보이는 길이' },
  { value: 50, label: '눈썹 위치', helper: '눈썹선을 기준으로 자연스러운 길이' },
  { value: 72, label: '눈썹 아래', helper: '눈썹을 살짝 덮는 길이' },
  { value: 90, label: '길게', helper: '눈썹 아래로 충분히 내려오는 길이' },
] as const;

export function getBangLengthLabel(value: number) {
  if (value < 28) return '눈썹 위';
  if (value < 45) return '눈썹 위 살짝';
  if (value < 62) return '눈썹 위치';
  if (value < 84) return '눈썹 아래';
  return '길게';
}

export function getBangLengthHelper(value: number) {
  const label = getBangLengthLabel(value);
  return BANG_QUICK_PRESETS.find((preset) => preset.label === label)?.helper ?? '앞머리 길이를 의미합니다.';
}
