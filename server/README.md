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
| `AI_PROVIDER` | `mock` | `mock`(결정적 picsum + 딜레이) / `real`(`OPENAI_API_KEY` 필요) |
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
| POST | `/ai/generate` | O | `{prompt,presetId}` → 후보 3종 |
| POST | `/ai/edit` | O | `{image,region,bang,sideLength,feedback}` → 요약 |

에러 envelope: `{ok:false, error:{code,message[,details]}}` + HTTP status
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
- **AI**: `AI_PROVIDER=mock`이면 결정적 mock URL + 0.5s 딜레이.
  `prompt`에 `__fail__` 포함 시 502 시뮬레이션(에러 경로 테스트용).
  `real` + `OPENAI_API_KEY`면 서버에서 OpenAI 호출 (키는 서버에만).
- **DB는 항상 실제 SQLite**를 사용한다 (mock 아님).
