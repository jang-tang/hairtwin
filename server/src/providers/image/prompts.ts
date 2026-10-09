import type { GenerateInput, EditInput, View } from './types.js';
export const DIRECTIONS = [
  { id: 'A', name: '현재 스타일에 가까운 제안', desc: '선택 스타일을 보수적으로 적용', instruction: 'Conservative variation: preserve current length and use subtle shaping.' },
  { id: 'B', name: '균형 잡힌 제안', desc: '선택 스타일의 실루엣과 질감 강조', instruction: 'Balanced variation: emphasize the chosen silhouette and texture.' },
  { id: 'C', name: '변화를 강조한 제안', desc: '상담 의도 안에서 더 선명한 변화', instruction: 'Distinct variation: stronger layering or volume, within the consultation intent.' },
];
export function settingsText(input: GenerateInput | EditInput): string {
  return JSON.stringify({ condition: input.condition, sideHair: input.sideHair,
    bang: { value: input.bang, meaning: '45 = eyebrow line, each 10 points = 1cm; higher = longer' },
    sideLength: { value: input.sideLength, meaning: '50 = earlobe line, each 10 points = 1cm; higher = longer' } });
}
export function generationPrompt(input: GenerateInput, direction: typeof DIRECTIONS[number], view: View, hasAnchor: boolean): string {
  const { refImages: _, ...preset } = input.preset;
  return [
    'Hairstyle consultation photograph. Output one ' + view + ' view, never a collage or text.',
    'Image 1 is the customer in the requested view. Preserve identity, face, pose, clothing, lighting and background; change hair only.',
    hasAnchor ? 'Image 2 is the approved hairstyle anchor for THIS candidate. Reproduce its exact cut, length, color, parting and volume from the requested angle.' : 'The next two images show the SAME customer from other angles. Preserve their identity and natural hairline.',
    'Any remaining images are STYLE references only, never identity references.',
    'Consultation intent: ' + input.intent + '. Preset: ' + JSON.stringify(preset) + '.',
    'Hair constraints: ' + settingsText(input) + '. Additional request: ' + (input.prompt ?? '') + '.',
    'Candidate ' + direction.id + ': ' + direction.instruction + ' Respect damage, texture, density and feasibility.',
    'Keep the full hair silhouette in frame. Output 1024x1024 PNG.',
  ].join('\n');
}
export function editPrompt(input: EditInput): string {
  return [
    'Edit the ' + input.view + ' image of the selected hairstyle ' + input.candidate.name + '.',
    'Image 1 is the exact baseline. Change hair only inside the transparent mask; protect all opaque pixels, identity, pose and background.',
    'Other images show this SAME hairstyle from other angles; retain its consistency.',
    'Region: ' + (input.region?.type ?? 'all') + '. Hair constraints: ' + settingsText(input) + '.',
    'Requested adjustments: ' + input.feedback.join(', ') + '. Customer request: ' + input.freeText + '.',
    'Original consultation intent: ' + input.original.intent + '. Output one 1024x1024 PNG, no collage or text.',
  ].join('\n');
}
export function editSummary(input: EditInput): string {
  return [input.region?.label ?? '전체', '앞머리 ' + input.bang, '옆머리 ' + input.sideLength, ...input.feedback, input.freeText].filter(Boolean).join(' · ');
}
