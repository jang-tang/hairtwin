export const routeMap = {
  login: '/login',
  dashboard: '/dashboard',
  customers: '/dashboard/customers',
  consultations: '/dashboard/consultations',
  presets: '/dashboard/presets',
  customerDetail: '/customers/:customerId',
  // 손글씨 프로세스: 로그인 → 대시보드 → (처음이면) 첫방문 → 다듬/신규 → 프리셋+세부 → 초안 → 영역수정 → 최종 → 시술/저장
  consultationStart: '/consultations/new/start',
  firstVisit: '/consultations/new/first-visit',
  intent: '/consultations/new/intent',
  photo: '/consultations/new/photo',
  style: '/consultations/new/style',
  generation: '/consultations/new/generation',
  feedback: '/consultations/new/feedback',
  finalize: '/consultations/new/finalize',
  report: '/consultations/new/report',
} as const;

export type ConsultationStep =
  | 'consultationStart' | 'firstVisit' | 'intent' | 'photo' | 'style'
  | 'generation' | 'feedback' | 'finalize' | 'report';

export const stepOrder: ConsultationStep[] = [
  'consultationStart', 'firstVisit', 'intent', 'photo', 'style', 'generation',
  'feedback', 'finalize', 'report',
];

export const stepLabels: Record<ConsultationStep, string> = {
  consultationStart: '상담 시작',
  firstVisit: '첫방문 확인 (원하는 사진·뒷모습·남녀/유형)',
  intent: '다듬어주세요 / 새로운 스타일',
  photo: '현재 머리 촬영',
  style: '프리셋 + 세부 설정',
  generation: '이미지 생성 (초안)',
  feedback: '영역별 수정 (그림 그리기)',
  finalize: '최종 이미지',
  report: '시술 진행 & 정보 저장',
};
