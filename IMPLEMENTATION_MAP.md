# Hair Twin V2 → React implementation map

| 개발 가이드 요구사항 | 구현 위치 |
| --- | --- |
| Login → Dashboard | `src/pages/auth/LoginPage.tsx`, `src/pages/dashboard/DashboardPage.tsx` (새작업/고객 정보/저장 정보) |
| 중앙 Route Map | `src/lib/routes.ts` (9단계: start → first-visit → intent → photo → style → generation → feedback → finalize → report) |
| 첫방문 분기 (원하는 사진·뒷모습·남녀/유형) | `src/pages/consultation/steps/FirstVisitPage.tsx`, `consultationStore` (isFirstVisit/gender/customerType/referenceImage) |
| 1. 다듬어주세요 / 2. 새로운 스타일 | `IntentPage.tsx` (serviceMode trim/new-style) |
| URL + State 동기화 | `src/hooks/useConsultationNavigation.ts`, `src/store/consultationStore.ts` |
| 인증 보호 | `src/app/auth/ProtectedRoute.tsx`, `PublicRoute.tsx` |
| 고객 관리 | `src/pages/dashboard/CustomersPage.tsx`, `src/pages/customers/CustomerDetailPage.tsx`, `src/repositories/customerRepository.ts` |
| 3면 촬영 데이터 | `src/types/image.ts`, `src/services/camera/cameraService.ts` |
| 스타일 프리셋 | `src/types/style.ts`, `src/repositories/presetRepository.ts` |
| 모발 상태/옆머리 뜸 | `src/types/consultation.ts`, `ConditionPage.tsx` |
| 3개 스타일 후보 × 3면 | `StyleCandidateSet`, `mockAiImageService.ts`, `CandidatesPage.tsx` |
| Bang Length 0~100 | `consultationStore.ts`, `StylePage.tsx` |
| 고객 피드백 → AI 해석 | `FeedbackPage.tsx`, `InterpretationPage.tsx` |
| 버전 V1/V2/V3 | `ImageVersion`, `ComparisonPage.tsx` |
| 미용사 검토 | `StylistReviewPage.tsx` |
| 최종 합의/리포트 | `FinalizePage.tsx`, `ReportPage.tsx`, `consultationRepository.ts` |
| Region drag/resize 기반 | `src/components/image/RegionEditor.tsx` |
| Repository abstraction | `src/repositories/*` |
| OpenAI key 비노출 구조 | `src/services/ai/*` (브라우저는 mock/backend client만 사용) |
| CSS tokens | `src/styles/tokens.css` |

## 현재 mock 범위

이미지 생성/해석/수정은 실제 OpenAI 호출 대신 `mockAiImageService`로 동작합니다. 카메라 서비스는 `getUserMedia` 진입부만 제공하며 실제 capture encoder/upload는 다음 구현 단계에서 연결합니다.

## 실제 백엔드 연결 위치

`src/services/ai/aiService.ts`를 backend API client로 교체합니다.
브라우저 → Backend API → OpenAI 구조를 유지하고 API key는 서버 환경변수에서만 읽습니다.
