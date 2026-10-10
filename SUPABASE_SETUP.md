# Supabase DB 연결

2026-10-08 `Je_CooL's projects` 조직의 서울 리전에 새 [hairtwin 프로젝트](https://supabase.com/dashboard/project/ccixswktycbmytsmnlsk)를 만들고 서버를 연결했습니다. PostgreSQL 17과 Session pooler를 사용합니다.

## 구조와 접근 권한

브라우저 → 기존 Express API/JWT 소유권 검사 → 앱 전용 PostgreSQL 계정 → Supabase 순서입니다. 기존 인증 방식과 목업 AI를 유지합니다. Supabase Auth/Storage는 이번에 도입하지 않았습니다.

`hairtwin` 스키마에 디자이너·고객·프리셋·상담 기록·AI 세션·버전·작업·사전 예약 테이블 8개를 둡니다. `PUBLIC`·`anon`·`authenticated`의 스키마·테이블 접근을 차단하고 모든 테이블에 RLS를 적용했습니다. 데이터 권한과 정책은 서버 전용 `hairtwin_app` 역할에만 부여합니다. 이 역할은 superuser·DB/역할 생성·RLS 우회 권한이 없으며, 상담 데이터의 사용자별 접근은 기존 Express 소유권 검사가 제한합니다. 사전 예약은 공개 접수만 제공하며 신청자 목록을 반환하는 API는 없습니다.

## 설정과 실행

로컬 `server/.env`에 실제 연결을 설정했습니다. 비밀번호·연결 문자열은 서버 전용이며 Git과 프런트 환경변수에 넣지 않습니다.

```dotenv
DB_PROVIDER=postgres
DATABASE_URL=postgresql://hairtwin_app.PROJECT_REF:URL_ENCODED_PASSWORD@SESSION_POOLER_HOST:5432/postgres
DATABASE_CA_PATH=./data/supabase-ca.crt
SEED_DEMO=false
DB_POOL_MAX=5
DB_CONNECT_TIMEOUT_MS=15000
DB_STATEMENT_TIMEOUT_MS=30000
DB_LOCK_TIMEOUT_MS=10000
```

이 프로젝트의 pooler는 `aws-0-ap-northeast-2.pooler.supabase.com`입니다. 다른 프로젝트의 호스트는 Connect 화면에서 확인합니다. Database Settings의 [공식 CA](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt)를 `server/data/supabase-ca.crt`에 저장하고 인증서·호스트 검증을 유지합니다. 다른 PC/배포에는 CA 파일과 비밀 환경변수를 별도로 설정합니다.

```powershell
npm.cmd --prefix server ci
npm.cmd --prefix server run dev
# 다른 터미널
npm.cmd run dev
```

`GET /api/health`는 DB 쿼리 후 `database: {provider: "postgres", status: "connected"}`를 반환합니다. 연결·필수 테이블 확인 실패 시 서버 시작을 중단하며 SQLite로 자동 폴백하지 않습니다.

## 마이그레이션과 데이터

[스키마 마이그레이션](supabase/migrations/20261008062852_hairtwin_backend.sql)을 원격 프로젝트에 적용했습니다. 앱 실행 계정에 DDL 권한은 없으며 원격 스키마는 관리자 연결로 변경합니다. 다른 환경에는 마이그레이션 적용과 앱 역할의 로그인 비밀 설정이 필요합니다.

기존 `server/data/hairtwin.sqlite`는 보존했고 고객 사진·기록을 클라우드에 자동 업로드하지 않았습니다. 새 DB에는 합성 PNG·검증 계정·상담을 저장해 확인했습니다. 기존 DB의 JWT를 사용 중인 브라우저는 다시 로그인해야 할 수 있습니다.

SQLite는 `DB_PROVIDER=sqlite`와 `DB_PATH`로 계속 지원합니다. 쿼리·서비스·컨트롤러를 비동기로 통합하고 PostgreSQL 트랜잭션은 같은 pool client를 사용합니다. SQLite 트랜잭션과 작업 체크포인트 쓰기는 직렬화합니다. 동시 로그인·고객 등록·상담 완료에는 트랜잭션 잠금을 적용합니다.

## 검증

2026-10-08 백엔드 빌드·회귀 테스트 28개 통과. 실제 Supabase에서 health, 동시 로그인, 고객·프리셋 생성/수정, 생성 요청 중복 방지, 8/9 진행률, 한 이미지 재시도, V2 편집, 시술 메모, 동시 완료 중복 방지, 다른 계정 접근 차단, 롤백, DB 재접속 후 복원 및 DB 무결성 제약을 확인했습니다. 보안 Advisor 경고는 없습니다.

```powershell
npm.cmd --prefix server test
# 읽기 전용 연결·스키마·서버 계정·RLS·공개 접근 권한 점검
npm.cmd --prefix server run db:check
# 원격 검증: 새 합성 계정·상담을 DB에 만들며 목업 인증/AI가 필수
npm.cmd --prefix server run test:postgres
```

실제 AI 품질, Supabase Auth/Storage, 기존 데이터 이전, 분산 작업 실행은 별도 작업입니다. 현재 이미지와 체크포인트는 PostgreSQL 텍스트 컬럼에 저장합니다.

성능 Advisor의 [미사용 인덱스 안내](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)는 새 DB에서 아직 조회되지 않은 인덱스 4개를 INFO로 표시했습니다. 고객·프리셋 조회와 외래 키 탐색에 필요한 인덱스를 유지합니다.

## 추가한 DB 운영 처리

- [상담 무결성 마이그레이션](supabase/migrations/20261008065449_hairtwin_record_integrity.sql): 같은 세션의 활성 상담 중복, 다른 디자이너의 고객/세션 연결, 다른 세션의 버전 연결을 DB가 차단합니다. SQLite에도 중복 인덱스와 관계 검사 트리거를 적용하며 각 로컬 마이그레이션은 트랜잭션으로 실행합니다.
- 서버와 db:check는 공통 검사로 필수 테이블·검증된 관계 제약·유효한 중복 방지 인덱스를 확인하며 누락 시 시작을 중단합니다. 다른 환경에는 `supabase/migrations/`의 세 마이그레이션을 파일명 순서대로 적용하고 `db:check`를 실행하세요.
- 연결 풀 크기, 연결 대기, 쿼리 실행, 트랜잭션 잠금 대기의 최대 시간을 설정할 수 있습니다. 모든 시간 값은 밀리초이며 양의 정수만 허용합니다.
- DB 연결/쿼리 시간 초과에는 `503 DATABASE_UNAVAILABLE`, 충돌에는 `409 DATABASE_CONFLICT`, 제약 위반에는 `400 DATABASE_CONSTRAINT`를 반환합니다. 실패한 쓰기를 자동 재전송하지 않습니다. SQLSTATE는 서버 로그의 `cause.code`에 남기고 원본 SQL·비밀번호·고객 데이터는 기록하지 않습니다.
- SIGINT/SIGTERM을 받으면 신규 작업을 막고 진행 중 이미지 처리를 취소한 뒤 성공 이미지와 남은 작업의 체크포인트 저장을 기다립니다. HTTP 요청을 정리하고 DB 연결 풀을 닫습니다. 30초 안에 종료하지 못하면 강제 종료되며 저장된 체크포인트로 다음 실행에서 재시도합니다.

운영 배포 시 기존 비밀번호 인증(`AUTH_PROVIDER=real`), 긴 랜덤 JWT 비밀값, 정확한 CORS 오리진을 설정해야 합니다. 사진 파일의 별도 Storage 이전과 정기 백업/복구 운영은 이 변경에 포함하지 않습니다.

## 사전 예약 정보

2026-10-10 [사전 예약 마이그레이션](supabase/migrations/20261010055134_salon_pre_registrations.sql)을 원격 DB에 적용했습니다. `hairtwin.pre_registrations`에 미용실명·이메일·선택 연락처 정보와 동의 문구 버전·동의 시각·신청/만료 시각을 저장합니다. 브라우저는 공개 POST API만 사용하고 DB 계정·신청 목록은 받지 않습니다. 서버 역할에는 이 테이블의 SELECT·INSERT·DELETE만 허용합니다.

같은 미용실명·이메일은 중복 저장하지 않으며 기존 담당자·지역·보관 기한도 덮어쓰지 않습니다. 미용실명은 공백·유니코드를 정규화하고 이메일은 소문자로 저장합니다. 접수는 IP당 시간당 10회로 제한합니다. 프록시를 추가하는 배포에서는 Express의 신뢰할 프록시 설정을 실제 구성에 맞게 검토해야 합니다.

보관 기한은 신청 시점부터 365일입니다. 서버 시작 시와 매시간, 새 신청 트랜잭션에서 만료 행을 삭제합니다. 서버가 중지된 기간에는 정리 작업이 실행되지 않으므로 상시 운영을 유지하거나 별도 DB 스케줄을 구성하세요. 실제 출시 안내 이메일 발송은 아직 연결하지 않았습니다.

출시 안내 대상은 권한 있는 운영자가 Supabase SQL Editor에서 아래처럼 확인할 수 있습니다. 이 쿼리는 외부 공개 API에 추가하지 않습니다.

```sql
SELECT salon_name, email, contact_name, region, consented_at, expires_at
FROM hairtwin.pre_registrations
WHERE expires_at > to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
ORDER BY created_at DESC;
```

사전 예약 API 테스트와 실제 PostgreSQL 저장·중복 처리 검증 통과. DB 연결·8개 비공개 테이블·RLS 검사 통과, 보안 Advisor 경고 없음.
