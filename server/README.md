# Hair Twin Server

미용실 태블릿 상담 도구 **Hair Twin**의 Express.js 백엔드.
프론트(`../src`)를 요구사항으로 역설계한 실제 서비스 구조다.

```text
Frontend → Express API → Service → Repository → SQLite
                              ↘ Provider (Real / Mock)
```

## 실행

```bash
npm install
cp .env.example .env   # 기본값 그대로 두면 키 없이 개발 가능
npm run dev            # :8787 (SQLite 마이그레이션 + 데모 시드 자동)
```

프론트는 `npm run dev`(:5173)로 띄우면 `/api`가 이 서버로 프록시된다(`vite.config.ts`).

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8787` | 리스닝 포트 |
| `DB_PATH` | `./data/hairtwin.sqlite` | SQLite 파일 (`:memory:` 가능) |
| `SEED_DEMO` | `true` | 기동 시 데모 시드(디자이너/고객2/프리셋1) |
| `JWT_SECRET` | dev 값 | 운영에서 반드시 교체 |
| `AUTH_PROVIDER` | `mock` | `mock`(이름만 로그인, DB 자동 생성) / `real`(비밀번호 필수) |
| `AI_PROVIDER` | `mock` | `mock`(고객 사진 기반 PNG 변형) / `real`(`OPENAI_API_KEY` 필요, 미설정 시 오류) |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | 실제 이미지 생성·편집 모델 |
| `OPENAI_API_KEY` | - | 서버 전용. 프론트에 노출 금지 |
| `CORS_ORIGIN` | `http://localhost:5173` | 허용 오리진(콤마 구분) |

## API (모두 `/api` prefix, envelope `{ok,data[,meta]}`)

| Method | Path | Auth | 설명 |
|---|---|---|---|
| GET | `/health` | - | 상태 확인 |
| POST | `/auth/login` | - | `{name}` → `{token, designer}` (mock: 자동 가입) |
| POST | `/auth/register` | - | `{name, password}` (real 모드용) |
| GET | `/auth/me` | O | 현재 디자이너 |
| GET/POST | `/customers` | O | 목록(`search,sort,page,limit`) / 생성 |
| GET/PATCH/DELETE | `/customers/:id` | O | 상세/수정/삭제(soft) |
| GET/POST | `/presets` | O | 목록(`search,category,page,limit`) / 생성 |
| GET/PATCH/DELETE | `/presets/:id` | O | 상세/수정/삭제(soft) |
| GET/POST | `/records` | O | 목록(`search,customerId,page,limit`) / 생성(트랜잭션) |
| GET/DELETE | `/records/:id` | O | 상세/삭제(soft) |
| POST | `/ai/generate` | O | 사진·상담 조건·프리셋 → 후보 3종 × 3방향, 초기 버전 저장 |
| POST | `/ai/edit` | O | 상담 세션·기준 버전·방향·영역·조정 조건 → 새 이미지 버전 |
| GET | `/ai/sessions/:id` | O | 로그인한 디자이너의 후보·버전 이력 조회 |

에러 envelope: `{ok:false, error:{code,message,requestId[,details]}}` + HTTP status
(`VALIDATION_FAILED` 400 / `UNAUTHORIZED` 401 / `FORBIDDEN` 403 / `NOT_FOUND` 404 /
`EXTERNAL_API_ERROR` 502 / `INTERNAL_ERROR` 500).

모든 리소스는 `designer_id` 소유권으로 격리된다.

## 구조

```text
src/
  index.ts / app.ts / config.ts
  db/        database.ts (node:sqlite + 버전형 마이그레이션) / seed.ts
  routes/    index.ts + schemas.ts (zod)
  controllers/ auth/customer/preset/record/ai
  services/    auth/customer/preset/record/ai
  repositories/ designer/customer/preset/record
  providers/image/ types + mock.provider + real.provider + index(factory)
  middleware/  auth(JWT) / validate(zod) / error
  utils/       http(AppError·paging) / ids / jwt
```

## Mock 전략

- **Auth**: `AUTH_PROVIDER=mock`이면 이름만으로 로그인, 없으면 `designers`에 자동 생성 후 JWT 발급.
  `real`로 바꾸면 bcrypt 비밀번호 검증으로 전환. 프론트 인터페이스 동일.
- **AI**: `AI_PROVIDER=mock`이면 입력 사진을 기반으로 결정적 PNG를 반환합니다.
  `prompt`에 `__fail__` 포함 시 502 시뮬레이션(에러 경로 테스트용).
  편집의 `freeText`에 `__fail__` 포함 시 편집 실패를 시뮬레이션합니다.
  `real` + `OPENAI_API_KEY`면 서버에서 OpenAI 호출 (키는 서버에만). 키가 없으면 503을 반환합니다.
- **DB는 항상 실제 SQLite**를 사용한다 (mock 아님).

사진 입력, 마스크 형식, 다각도 생성, 버전 저장과 테스트는 [AI 파이프라인 안내](../AI_PIPELINE.md)를 참고하세요.
회귀 테스트: `npm.cmd test` (실제 API 호출 없음).

## 실패 원인 로그

화면은 `/api/ai/jobs/generate`, `/api/ai/jobs/edit`로 작업을 시작하고 `/api/ai/jobs/:id`를 조회합니다. `/cancel`은 진행 중 요청을 중단하고 `/retry`는 성공한 이미지를 재사용합니다. SQLite 체크포인트·단일 프로세스 작업 관리·검토 저장은 [AI 파이프라인](../AI_PIPELINE.md)을 참고하세요.

비동기 실패는 `ai.job.failed` 이벤트에 작업·이미지 단계·오류 ID를 기록합니다. HTTP 시작 요청이 성공했더라도 작업 상태가 `failed`일 수 있으므로 작업 조회 결과를 확인해야 합니다.

서버는 요청마다 UUID를 생성해 `X-Request-ID` 응답 헤더에 넣습니다. 오류 응답의 `error.requestId`와 같은 값이며, 프론트의 오류 메시지에도 `오류 ID`로 표시됩니다. 브라우저 개발자 콘솔의 `[api.failed]`와 서버 터미널의 `request.failed`를 이 ID로 연결할 수 있습니다.

중앙 오류 처리기는 개발·운영 모드 모두에서 stderr에 JSON 한 줄을 출력합니다. 4xx는 `warn`, 5xx는 `error`입니다. 입력 검증, 인증, 404, 요청 제한, 잘못된 JSON, 처리 중 예외를 기록합니다.

| 필드 | 의미 |
| --- | --- |
| `requestId`, `timestamp`, `durationMs` | 요청 추적과 실패까지 걸린 시간 |
| `method`, `route`, `status`, `code`, `message` | 실패한 API와 안전한 오류 설명; route는 라우터 경로 기준 |
| `ai.operation`, `ai.phase`, `ai.candidateId`, `ai.view`, `ai.model` | 실제 AI 실패의 생성/편집 단계, 후보, 방향, 모델 |
| `ai.reason` | `not_configured`, `timeout`, `network`, `upstream`, `invalid_output` |
| `ai.upstreamStatus`, `ai.upstreamCode`, `ai.upstreamType`, `ai.upstreamRequestId` | 외부 실패 상태와 제한된 식별자 |
| `cause.name`, `cause.code`, `cause.location` | 예외 종류·원인 코드·확인 가능한 서버 소스 위치 |

외부 API의 401·403·429, 사용 한도 초과, 정책 거절, 시간 초과, 연결 실패, 잘못된 PNG 응답을 구분합니다. AI 진단 메타데이터는 서버 로그에만 남기고 클라이언트에는 오류 설명과 추적 ID를 반환합니다.

새 오류 로그에는 요청 본문, 사진, 고객 이름, 상담 문장, 인증 헤더, 키, URL 쿼리, 외부 오류 원문 및 전체 스택을 넣지 않습니다. 일반 접근 로그인 morgan 출력과는 별도이며, 로그 파일이나 외부 수집 서비스 연결은 추가하지 않았습니다. 연결이 서버에 도달하기 전에 실패하면 브라우저 로그만 남고 서버 오류 ID는 없습니다.

검증: `test/error-log.test.ts`에서 운영 모드 로그, ID 연결, 정보 제외, 입력·요청 제한 오류를 확인하고 `test/image-provider.test.ts`에서 AI 실패 단계·원인 분류를 확인합니다.
