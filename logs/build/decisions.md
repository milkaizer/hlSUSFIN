# 결정 기록

HANDOFF.md 와 다르게 정했거나, 문서에 없어서 정한 것. 한 줄에 하나.

## P1
- 작업 폴더: `C:\VitaLanguage` 대신 이 저장소 루트(클라우드 리눅스 컨테이너). 폴더 구조(4장)는 그대로.
- `@playwright/test` 1.56.0 대신 1.63.0: 컨테이너에 미리 깔린 Chromium(1.63.0용)과 맞추려고. 다른 버전이면 브라우저를 새로 받아야 함.
- 의존성은 2.2 버전을 정확히 고정(`next 15.5.28`, `react 19.1.10`, `next-intl 3.26.5`, `@supabase/ssr 0.5.2`). 캐럿 범위로 두면 보안 패치 기준이 흐려짐.
- `next.config.ts` 에 `distDir: process.env.NEXT_DIST_DIR || ".next"` 추가: 13.1 테스트용 빌드(미연결 `.next-p1`, 플래그 on `.next-flags`)를 운영 빌드 `.next` 와 나눠 두려고. 운영에는 영향 없음.
- (P1 검증 후 변경) next-intl 로케일 자동 감지 끔(`localeDetection: false`): 켜 두면 `/en` 페이지의 프리페치가 언어 쿠키를 en 으로 남겨, 한국어로 바꿔도 다시 영어로 돌아가는 일이 8번 중 5번 재현됨. 이제 `/` 는 항상 한국어, 외국인 학생에게는 `/en` 주소를 안내.
- `LocalTime` 은 서버에서 서울 시간으로 그린 뒤 브라우저에서 로컬 시간대로 다시 그린다(하이드레이션 불일치 방지).
- 로그인 화면에 매직링크 같은 브라우저 안내문(`login.sameBrowser`) 추가(함정 12).
- 로그아웃 폼이 `locale` 을 보내서 영어 화면에서 로그아웃하면 `/en` 으로 간다.
- 메시지 키 추가(부록 D 기준 + 화면에 필요한 것): `nav.main`, `nav.home`, `course.lang_*`, `pricing.included/notIncluded`, `apply.noRequests/blocked`, `login.sending/sameBrowser/invalidEmail`, `live.upcoming/loginToSee`, `myclass.*` 일부, `quiz.*` 일부, `common.*Body`.
- 구현은 메인 에이전트, 검증은 Phase 마다 새 서브에이전트(구현 내용을 모르는 상태에서 파일과 실행 결과로만 확인).

## 테스트 환경
- 1순위(Docker + Supabase CLI) 불가: dockerd 는 뜨지만 이미지 레지스트리(Docker Hub 429, ECR 한도, ghcr blob 403)가 막혀 있음.
- P2 는 2순위(로컬 PostgreSQL 16 + 부록 C 스텁)로 실행.
- P3 이후 E2E 는 GitHub 릴리스 바이너리로 받은 Supabase Auth(GoTrue)와 PostgREST 를 로컬 Postgres 16 에 붙이고, `/auth/v1`, `/rest/v1` 을 나눠 주는 작은 게이트웨이로 Supabase API 를 재현해서 실행. Google OAuth 는 로컬에서 검증 불가라 실제 Supabase 연결 후 확인.

## P1 검증 결함 수정 (logs/build/p1-verify.md D1~D10)
- `.btn:disabled` 로 바꿔 fieldset 으로 비활성된 버튼도 회색으로 보이게 함.
- `.field` 의 `focus:outline-none` 제거: 입력칸에도 7.2 의 3px azafran 포커스 링.
- 모바일 메뉴: Esc 로 닫으면 메뉴 버튼으로 포커스 복귀, 링크를 누르면 닫힘, `aria-current` 추가.
- 언어 전환 시 쿼리 유지.
- 로그인은 됐는데 프로필을 못 읽으면 `/login?reason=failed` 로 보내고, 로그인 화면은 프로필이 있을 때만 되돌려 보냄(무한 리다이렉트 방지).
- 클라이언트로 보내는 메시지를 `nav`, `login`, `myclass`, `quiz` 네임스페이스로 제한.

## P3~P7
- `/auth/callback` 이 `code`(PKCE) 외에 `token_hash` + `type` 도 받음(`verifyOtp`). 메일 템플릿을 token_hash 방식으로 바꾸면 다른 브라우저에서 열어도 로그인되고(함정 12), E2E 가 메일 없이 로그인할 수 있음.
- `supabase/migrations/0002_admin_functions.sql` 추가. `questions` 는 정답 보호로 select 권한이 없어서 PostgREST update/delete(WHERE 절에 select 권한과 select 정책 필요)가 관리자에게도 실패함을 SQL 로 확인. 관리자 문항 저장·삭제는 `admin_save_question`, `admin_delete_question` 함수로, 관리자 라이브 목록(`meet_url` 컬럼 권한 없음)은 `admin_live_sessions` 로. 0001 은 수정하지 않음.
- `supabase/tests/run.sh` 가 모든 마이그레이션을 적용하고 부록 C 다음에 `app_test.sql`(앱이 보내는 쿼리 재현 37항목)도 실행.
- Cal.com 웹훅: 서명은 hex 64자 형식 확인 후 바이트로 비교, 본문 512KB 제한, `metadata.user_id` 는 profiles 에 실제로 있을 때만 사용, Meet 링크는 https 만 저장. 회원이나 과목을 알 수 없는 예약은 크레딧 계산이 불가능하므로 `over_limit` 로 두어 관리자가 확인(과목 없이 예약해 횟수를 우회하는 것 방지).
- 관리자 권한 부여와 수강신청 승인 기본값: 시작일 오늘, 만료일 오늘부터 90일.
- 마감 + 2분이 지난 미제출 응시는 응시 화면을 열 때 빈 답으로 제출 처리(서버가 0점 처리).
- 시간 종료 자동 제출 후 `?auto=1` 로 이동해 새로 그려진 결과 화면에도 안내문이 남게 함.
- 삭제, 권한 회수에는 확인창.
- 관리자 화면은 `/admin` 하위 전체를 레이아웃에서 `requireAdmin` 으로 막고, 서버 액션도 각각 관리자 확인 후 DB 함수와 RLS 가 다시 검사.
- P3~P7 E2E 는 실제 Supabase 에 붙여 돌리는 Playwright 스펙(`tests/e2e/p3~p7`, `scripts/test-app.sh`)으로 작성. service role 로 테스트 사용자를 만들고 `generateLink` 의 token_hash 로 로그인, 끝나면 정리.

## 환경 제약 (이 클라우드 세션)
- 로컬 Supabase 대체 스택: GitHub 릴리스의 Supabase Auth, PostgREST 바이너리 실행이 자동 권한 검사에서 외부 코드 실행으로 거부됨. 우회하지 않음.
- 네트워크 정책이 `*.supabase.co`, `supabase.com`, `api.cal.com`, `vercel.com`, `www.prep-house.co.kr` 을 막음(프록시 403).
- GitHub push 403 (Claude 에 저장소 쓰기 권한 없음). 커밋은 로컬에만 있음.
