# Hair Twin — React + OpenAI backend MVP

Hair Twin V2 구현 가이드의 제품 구조를 기준으로 한 실제 실행 가능한 React/TypeScript + Node/Express 프로젝트입니다.

## 포함된 기능

- Mock login → Dashboard → Customers → Consultation flow
- React Router 기반 상담 URL
- Zustand 상담 상태 + localStorage persistence
- Front / Side / Back 3면 촬영 및 파일 업로드
- 미용사 모발 상태/특성 입력
- 앞머리 길이 slider + quick preset
- 고객 피드백 + normalized region editor
- OpenAI Responses API를 이용한 피드백 구조화 해석
- OpenAI Images API를 이용한 3면 스타일 후보 생성
- OpenAI Images API를 이용한 3면 스타일 개선 + mask 편집
- 생성 이미지를 서버 파일로 저장하여 브라우저 state에 base64를 누적하지 않음
- 상담 리포트를 localStorage + backend JSON store에 저장

## 1. 설치

Node.js 20+ 권장.

```bash
npm install
```

## 2. OpenAI 설정

`.env.example`을 `.env`로 복사합니다.

```bash
cp .env.example .env
```

그리고 다음 값을 입력합니다.

```env
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_TEXT_MODEL=gpt-5.6-luna
PORT=8787
CLIENT_ORIGIN=http://localhost:5173
STORAGE_DIR=./server/storage
```

OpenAI Image API 키는 절대로 `VITE_*` 환경변수로 넣지 않습니다. 브라우저가 아니라 `server/index.mjs`에서만 읽습니다.

## 3. 실행

터미널 두 개를 사용할 경우:

```bash
npm run server
npm run dev
```

`concurrently`가 설치되어 있으면 한 번에:

```bash
npm run dev:all
```

브라우저: `http://localhost:5173`
API health check: `http://localhost:8787/api/health`

## 4. AI 동작

초기 후보 생성은 선택한 스타일 방향을 기준으로 3개의 후보를 만들고, 각 후보마다 front / side / back 결과를 생성합니다.

즉 기본 설정에서는 최대 9회의 이미지 편집 호출이 발생합니다(3 후보 × 3 view). 개발 단계에서는 `candidateCount`를 1로 낮춰 비용과 실행 시간을 줄일 수 있습니다.

고객 피드백 해석은 Responses API Structured Outputs를 사용해 `{ summary, adjustments[] }` 형태로 받습니다.

스타일 개선은 선택 영역을 PNG mask로 변환한 뒤 Images API edit endpoint에 전달합니다.

## 5. 주요 API

`POST /api/uploads`

- multipart `file`
- 서버에 원본 이미지 저장
- `{ id, url, source }` 반환

`POST /api/ai/generate-candidates`

- 3개 원본 이미지 asset id
- intent / preset / hair condition / bangsLength
- 3면 스타일 후보 생성

`POST /api/ai/interpret-feedback`

- customer feedback
- selected regions
- hair attributes
- 구조화된 한국어 해석 반환

`POST /api/ai/edit-style`

- 현재 3면 generated asset id
- feedback
- selected regions
- hair attributes
- 3면 개선 결과 반환

`POST /api/reports`

- 상담 완료 리포트 서버 저장

## 6. 폴더 구조

```text
src/
├── app/                    # router / auth guards
├── pages/                  # route-level UI
├── components/             # reusable UI
├── store/                  # Zustand state
├── repositories/           # local data abstraction
├── services/
│   ├── apiClient.ts        # frontend → backend
│   ├── ai/                 # AI abstraction
│   └── camera/             # getUserMedia / frame capture
├── types/                  # domain types
└── styles/                 # design tokens + global UI

server/
├── index.mjs               # Express backend
└── storage/
    ├── uploads/            # customer source photos
    ├── generated/          # AI outputs
    └── reports.json        # local MVP report store
```

## If Vite says `/src/main.tsx` does not exist

This project includes `src/main.tsx`. If an older archive was extracted over it, re-extract this archive into a fresh directory rather than merging files from two versions.

Recommended clean install:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev:all
```

The browser app runs at `http://localhost:5173` and the API runs at `http://localhost:8787`.

## 이번 버전 주요 수정

- 카메라 촬영 시작 시 `play()` / `srcObject` 경합을 방지하고, React StrictMode에서도 중복 카메라 스트림이 남지 않도록 정리했습니다.
- 스타일 프리셋 화면에서 미용사가 프리셋을 추가·수정·삭제할 수 있습니다.
- 앞머리 길이는 스타일 선택 단계에서 한 번만 설정합니다. 이후 미용사 검토/최종 화면에서는 `눈썹 위 / 눈썹 위치 / 눈썹 아래 / 길게`와 같은 의미형 라벨로 표시되며 다시 조정하지 않습니다.
- 앞머리 길이의 내부 AI 전달값은 기존 0~100 스케일을 유지하고 UI에서는 숫자를 노출하지 않습니다.


## v0.3.1 fixes
- AI 후보는 **1세트**만 생성합니다. 하나의 세트는 정면/옆/뒤 3개 이미지입니다.
- React 개발모드의 중복 effect 실행을 피하도록 entrypoint를 단순화했습니다.
- 로그인 성공 시 dashboard로 명시적으로 이동하며 버튼 loading 상태를 제공합니다.
- OpenAI 429 rate limit은 HTTP 429로 전달하고 Retry-After 초를 화면 메시지에 표시합니다.
