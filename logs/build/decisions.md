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

## P3~P7 검증, P9 보안 리뷰 반영 (logs/build/p3-p7-verify.md, logs/build/p9-security.md)
- `0003_security.sql` 추가 (0001, 0002 는 그대로):
  - 게시판 컬럼 권한 축소: 학생은 제목, 내용, 비공개만 수정. kind, category, created_at 조작으로 학생 질문을 전체 공지로 바꾸던 문제(P9-1, High) 차단.
  - `posts_read` 를 행 값으로 판단하도록 변경. `can_read_post(id)` 가 INSERT ... RETURNING 의 새 행을 못 봐서 Q&A 질문 작성이 항상 실패하던 문제(검증 D1) 해결. 작성자는 권한이 끝나도 자기 질문을 볼 수 있음.
  - `start_attempt` 에 사용자+퀴즈 advisory lock (동시 호출로 응시 횟수 우회, P9-4).
  - `attempt_result` 는 응시 때 받은 문항만, 정답·해설은 지금도 권한이 있을 때만 (P9-3). 권한이 끝나도 점수와 내 답은 보임.
  - 과목마다 확인 중인 수강신청 하나만 (유니크 부분 인덱스, P9-8). 앱은 "이미 확인 중인 신청이 있습니다" 안내.
  - 가입 이름 100자 제한, 트리거 함수 직접 실행 권한 회수 (P9-9).
- `supabase/tests/security_test.sql` 19항목 추가, `run.sh` 에서 실행.
- Cal.com 웹훅: `metadata.user_id` 는 참석자 이메일이 그 회원 이메일과 같을 때만 믿음. 이메일로만 찾았거나 과목을 모르면 `over_limit` 로 두어 크레딧을 쓰지 않고 관리자가 확인(P9-2). 취소된 예약이 늦게 다시 와도 되살리지 않음(검증 D9). 재예약 취소는 같은 회원 예약에만. Meet 링크는 meet.google.com 만 저장·표시(P9-6).
- 관리자 현황 카드 이름을 "확인 필요한 예약"으로 바꿈: 크레딧 초과뿐 아니라 회원·과목 확인이 필요한 예약도 세기 때문(검증 D8).
- `safeNext`: 제어 문자, 공백, 역슬래시를 거부하고 URL 로 정규화(탭으로 //evil.com 을 만드는 오픈 리다이렉트, P9-5, 검증 D3).
- 1계정 1세션 보강: 미들웨어가 퍼센트 인코딩 경로(`/%6Dyclass`)도 풀어서 검사(검증 D2). `getViewer` 가 쿠키 토큰과 DB 토큰을 비교해 다르면 로그아웃 상태로 보므로 경로 모양과 상관없이 페이지, 서버 액션, 게시판에서도 막힘(P9-7).
- `/auth/signout` 은 다른 출처의 POST 를 403 으로 거부(검증 D12).
- Q&A 질문 id 를 서버에서 만들어 insert (RETURNING 의존 제거). 게시글·댓글 삭제 실패 시 안내.
- 문구: 과목 탭 권한 없음 전용 문구, 퀴즈 시작 실패를 횟수 초과와 구분.
- E2E 스펙 수정: 13.5-6 은 메시지 키 대신 문항별 정답·해설 값으로 확인(검증 D4), 13.7-3 은 이동을 기다린 뒤 URL 읽기(D5), 관리자 저장 완료를 DB 폴링으로 확인(D6), 캘린더는 서울 기준 다음 달을 계산하고 각 브라우저에서 그 달로 이동(D7), 정리는 학생 먼저 지우고 실패를 기록(D13). P9-2 웹훅 이메일 불일치 테스트 추가.

## P8 재점검 반영 (logs/build/p8-check.md)
- 응시 횟수가 2회 이상인 모의고사는 마지막 응시를 마칠 때까지 정답·해설을 숨김. 1회차 결과로 2회차를 만점 받는 것 방지. 결과 화면에 "정답과 해설은 응시 횟수를 모두 사용한 뒤에 공개됩니다" 안내.
- 권한이 끝난 상태로 제출하면 응답을 무시하고 0점 마감(`submit_attempt`).
- 차단·승인 대기 회원은 `call_credits_for` 가 0 이라 예약이 "확인 필요"로 들어옴.
- Cal.com 예약 링크에 `metadata[sig]`(CAL_WEBHOOK_SECRET 으로 만든 HMAC) 추가. 웹훅은 서명이 맞을 때만 metadata 의 회원과 과목을 믿음. 이메일만으로 찾은 예약은 "확인 필요". 그래서 `CAL_WEBHOOK_SECRET` 이 없으면 예약 버튼이 "예약 링크가 아직 준비되지 않았습니다"로 보임. 재예약 시 이전 예약 취소도 서명이 맞을 때만.
- 취소 웹훅이 생성보다 먼저 오면 취소 행을 남겨 늦게 온 생성이 크레딧을 쓰지 않게 함. 잘못된 JSON 본문(null 등)은 400.
- 1계정 1세션 검사를 미들웨어에서 로그인한 모든 요청으로 넓힘(게시판 포함). 로그인 화면에서는 이동 없이 이 기기 세션만 정리. 쓰는 동안 `vita_sid` 기한을 30일로 계속 연장.
- 학생 화면의 over_limit 문구를 "강사 확인 중"으로 (크레딧 초과가 아닌 경우도 있으므로).
- 게시판 삭제 실패 전용 문구, 권한이 끝난 학생의 결과 화면 제목 대체, 수강신청 로그인 링크에 과목 유지(P1 D9).
- 테스트 스크립트가 다시 쓰는 빌드 로그(`logs/build/*-build*.log`)는 git 에서 제외.
- 0003 의 수강신청 유니크 인덱스는 이미 중복 신청이 있는 DB 에서는 실패하므로 파일에 대처 방법 주석.
- HANDOFF.md 14.1-3 은 원문 그대로 두고, 실행할 SQL 목록(0001, 0002, 0003, seed)은 `docs/SETUP.md` 와 `NEXT_STEPS.md` 에 적음.
