# 사진 기반 AI 상담 파이프라인

현재 기본 공급자는 mock입니다. 실제 API 키 연결과 유료 API 호출은 이번 구현·검증에 포함하지 않았습니다.

## 입력과 생성

사진 선택/모바일 촬영 입력은 PNG·JPEG·WebP(원본 최대 15MB)를 받습니다. 브라우저가 전체 사진을 잘라내지 않고 1024×1024 PNG로 정규화합니다. 생성 입력에는 정면·측면·후면 사진, 상담 의도, 모발 특성, 앞머리·옆머리 길이, 옆머리 상태, 프리셋 상세 내용과 참고 사진 최대 2장이 포함됩니다.

화면은 `POST /api/ai/jobs/generate`로 작업을 시작합니다. 기존 동기 API `POST /api/ai/generate`도 유지합니다. 공통 입력:
- `requestId`: 재시도 시 유지하는 요청 ID
- `customerName, photos: {front,side,back}, intent`
- `presetId, preset: {id,name,desc,category?,length?,bang?,perm?,color?,memo?,refImages?}`
- `condition: {damage,texture,thickness,density,elasticity,feel}, bang, sideLength, sideHair`
- 선택적인 `prompt`

매장 프리셋의 텍스트는 로그인한 디자이너 소유 DB에서 확인합니다. 서버는 외부 사진 URL을 다운로드하지 않으며, PNG 바이트와 크기를 검사합니다.

Real 공급자는 OpenAI `/v1/images/edits`를 이용합니다. 후보 A(보수적)·B(균형)·C(변화 강조)는 각각 별도 프롬프트와 호출을 사용합니다. 후보별 정면을 먼저 생성하고, 해당 정면 결과를 동일 후보의 측면·후면 생성 참조로 전달합니다. 첫 이미지는 항상 출력할 방향의 고객 사진입니다. 후보당 3회, 전체 9회 호출하며, 결과를 다른 후보·방향에 복사하지 않습니다.

응답은 `{ok:true,data:{sessionId,candidates,versions,mock,provider}}`입니다. 각 후보는 초기 `versionId`를 갖습니다.

## 마스크 편집

화면은 `POST /api/ai/jobs/edit`를 사용하고 기존 동기 API `POST /api/ai/edit`도 유지합니다. 공통 입력은 `requestId, sessionId, baseVersionId, view, region, condition, bang, sideLength, sideHair, feedback, freeText`입니다. 서버가 저장된 기준 버전의 이미지를 찾습니다.

`region`은 `{id,type,x,y,w,h,label}`이며 좌표는 0~1입니다. `null`은 전체 이미지입니다. 서버는 원본과 같은 크기의 RGBA PNG 마스크를 만들고, 선택한 사각형을 투명하게, 나머지를 불투명하게 설정합니다. 마스크는 다중 참조 이미지 중 첫 번째 이미지에 적용합니다.

반환된 편집 이미지에서 선택 영역 밖의 픽셀은 서버가 원본 픽셀로 복구합니다. 이어서 나머지 두 방향은 편집된 이미지를 스타일 참조로 사용해 다시 생성합니다. 이 두 방향의 스타일 일관성은 참조 이미지와 프롬프트로 유도하며, 실제 모델의 시각적 품질은 키 연결 후 검증해야 합니다. 자동 얼굴·헤어 세그멘테이션이나 3D 재구성은 구현하지 않았습니다.

응답은 `{ok:true,data:{version,mock,provider,summary}}`이고, `version.views`가 실제 반환 이미지입니다. 화면에서 임의 목업 버전으로 대체하지 않습니다.

공식 형식: [OpenAI 이미지 생성·편집 안내](https://developers.openai.com/api/docs/guides/image-generation).

## 버전과 저장

- SQLite 마이그레이션 v2: `ai_sessions`, `ai_versions`, 상담 기록의 `ai_session_id/selected_version_id`.
- 세션에는 원본 사진과 생성 입력을 저장합니다. 각 버전은 반환된 PNG data URL, 후보 ID, 부모 버전 ID, 생성 시각, 조정 조건, 자유 입력·피드백을 보관합니다.
- 상담 세션·편집 버전은 모든 방향이 성공한 후 저장합니다. 작업 중 성공한 개별 이미지는 체크포인트로 저장하며 실패하면 기존 버전은 그대로 남습니다.
- 같은 생성/편집 요청 ID의 재시도는 이미 저장한 결과를 반환합니다. 진행 중 동일 요청도 공유합니다. 서버 재시작 전에 완료된 결과도 DB에서 복원합니다.
- 다른 요청 ID로 동일 세션을 동시에 편집하면 409입니다. 상담당 최대 50개 버전을 보관합니다.
- `GET /api/ai/sessions/:id`는 현재 로그인한 디자이너의 후보·버전만 반환합니다.
- 상담 완료 시 `POST /api/records`에 `sessionId, selectedVersionId, stylistReview`를 넣으면 서버가 선택 버전의 이미지·조건·검토 내용을 저장합니다. 새 AI 상담 기록은 검토가 필수이며 동일 요청의 재시도로 기록이 중복되지 않습니다.
- 비교 화면에서 과거 버전을 고르면 그 이미지·조건이 재편집 기준이 됩니다. 기록 상세 화면에서는 다른 후보와 과거 버전도 다시 볼 수 있습니다.
- 진행 중인 상담과 사진은 IndexedDB에 보관해 새로고침 후 복원합니다. 대시보드의 '진행 중인 상담 이어가기'로 돌아갈 수 있습니다. 로그아웃·새 상담은 현재 임시 상담을 초기화합니다.
- 이미지 데이터는 서버 DB(SQLite 또는 Supabase PostgreSQL)와 브라우저 IndexedDB에 저장합니다. Supabase 설정은 [연결 안내](SUPABASE_SETUP.md)를 참고하세요. 대규모 운영용 객체 저장소, 이미지 정리·보존 정책은 별도 확장 대상입니다.

## 목업과 실제 모드

`AI_PROVIDER=mock`은 고객 사진 기반의 결정적 PNG 변형으로 후보·마스크·버전 저장 흐름을 테스트합니다. 실제 헤어 합성 품질을 모사하지는 않습니다. 외부 이미지 서비스에 의존하지 않습니다.

`AI_PROVIDER=real`은 서버 키가 있어야 동작합니다. 키가 없거나 API가 실패하면 오류를 반환하며, 목업 이미지로 조용히 바꾸지 않습니다. 모델은 `OPENAI_IMAGE_MODEL`로 설정할 수 있고 기존 모델인 `gpt-image-1`이 기본입니다. 각 호출은 최대 180초입니다. 작업 API는 성공한 이미지를 재사용하고 남은 이미지만 재시도합니다. 기존 동기 API에는 진행률·부분 재시도 기능이 없습니다.

## 진행률·취소·부분 재시도

SQLite v3 또는 Supabase `hairtwin.ai_jobs`에 입력·이미지별 상태·성공 이미지·결과를 저장합니다. 단일 서버 프로세스 기준입니다.

| API | 동작 |
| --- | --- |
| `POST /api/ai/jobs/generate`, `POST /api/ai/jobs/edit` | 202 응답으로 작업 ID 반환; 같은 요청 ID는 같은 작업 반환 |
| `GET /api/ai/jobs/:id` | 상태·이미지별 완료/실패·완료 수·진행률 조회; 완료 시 결과 포함 |
| `POST /api/ai/jobs/:id/cancel` | 현재 외부 HTTP 요청에 취소 신호 전달, 다음 호출·최종 버전 저장 중단 |
| `POST /api/ai/jobs/:id/retry` | 저장된 입력·성공 이미지를 유지하고 실패/미생성 이미지 재시도 |

생성 9장·편집 3장의 실제 완료 수로 진행률을 계산합니다. 최종 DB 저장 전에는 최대 99%, 저장 후 100%입니다. 개별 API 호출 내부 진행률·남은 시간은 추정하지 않습니다. 정면 앵커 실패 시 해당 후보의 옆·뒤는 대기하고 다른 후보는 진행합니다. 성공한 앵커·방향은 재시도에서 다시 호출하지 않습니다.

취소된 작업도 완료 이미지는 보관합니다. 서버 재시작 후 진행 중이던 작업은 `JOB_INTERRUPTED`로 전환해 사용자 재시도로 복구합니다. 화면은 IndexedDB에 작업 ID를 보관하고 새로고침 시 같은 작업을 조회합니다. 상태 조회는 소유권을 검사하고 원본 입력·중간 이미지를 반환하지 않습니다. 진행 중·완료 작업의 재시도는 멱등입니다.

비동기 실패는 `ai.job.failed` JSON 로그에 `jobId, stepId, requestId`와 안전한 진단을 기록합니다. 화면의 오류 ID로 연결할 수 있습니다.

## 디자이너 검토

이미지 비교 다음에 시술 가능 여부(가능/조건부 가능/어려움), 컬 강도, 옆머리 시술 방향, 검토 사항, 최대 1000자 메모를 입력합니다. 조건부·어려움은 이유 메모가 필수입니다. 가능 여부는 디자이너가 판단하며 AI 자동 판정은 하지 않습니다.

검토는 `versionId`에 연결됩니다. 다른 버전 선택·새 편집 결과는 검토를 초기화합니다. 미검토 최종 확정·리포트 접근은 검토 화면으로 이동하며 서버도 선택 버전 일치·메모 조건을 검사합니다. 검토 내용은 `consultation_records.stylist_review_json`에 저장되어 최종 화면·리포트·기록 상세에서 조회합니다. 기존 검토 없는 기록은 그대로 조회할 수 있습니다.

AI 생성·편집과 영구 버전 저장에는 Express 서버 로그인/연결이 필요합니다. 기존 별도 `VITE_AI_PROXY_URL` 경로와 프론트의 로컬 AI 폴백은 제거했습니다. `VITE_MOCK_AI`는 연습용 사진·화면 샘플만 제어합니다.

## 검증

프로젝트 루트:
```powershell
npm.cmd run build
npm.cmd --prefix server run typecheck
npm.cmd --prefix server run build
npm.cmd --prefix server test
```

테스트는 임시 SQLite DB와 가짜 HTTP transport를 사용합니다. 유료 API나 실제 고객 사진을 사용하지 않습니다. 입력·권한 검증, 후보별/다각도 이미지 순서, 조건·자유 입력 전달, 마스크 알파와 외부 픽셀 보존, 실패 시 이력 유지, 이전 버전 재편집, 요청 중복 방지, 상담 기록 연결, DB 재연결 복원을 확인합니다.
