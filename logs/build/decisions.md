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

## Step A prep-house 벤치마킹 (A-3~A-5, Windows 로컬 세션)
- 실행 환경: Windows 11 로컬 `C:\VitaLanguage`, Node 24.22.1 LTS(winget), `@playwright/test` 1.63.0 그대로, Chromium 은 `npx playwright install chromium`.
- 벤치마킹 원자료: Cowork 세션 분석 문서를 `logs/build/benchmark-prephouse.md`, 캡처 32장을 `logs/build/screens/prephouse/` 로 옮김(세션 임시 폴더는 지워질 수 있음).
- 홈 섹션 순서는 HANDOFF 6.1 그대로 유지. prep-house 는 증거(점수, 후기, 합격자)를 상품 앞에 두지만 우리 합격자·후기는 플래그 off 스페이서라 앞으로 당겨도 빈 자리만 생기고, 프로모션 캐러셀과 강사진 3열은 콘텐츠가 없어 넣지 않음. 순서가 같으므로 `p1-public.spec.ts`, `p1-flags.spec.ts` 의 `data-section` 기대값은 바꾸지 않음.
- 모바일에서도 섹션 순서를 바꾸지 않음(벤치마크 13장). 폭별 분기 테스트가 필요 없음.
- 공용 클래스(`.btn-*`, `.panel`, `.field`)의 반경, 크기, 색은 그대로 두고 공개 페이지 전용 클래스와 컴포넌트를 새로 만듦. 관리자 화면과 My Class 표가 같이 바뀌는 일을 막으려고(벤치마크 15장 1번).
- 주 CTA 는 prep-house 의 밝은 배경 + 어두운 글자 대신 기존 `.btn-primary`(azul, 흰 글자) 유지. 관리자 화면 전파를 피하고 우리 브랜드 색을 지키려고. 보조 CTA 만 알약형 외곽선으로 역할 구분.
- 결제 비활성은 HANDOFF 6.3 의 disabled 결제 버튼을 유지하고, prep-house 단독 구매 불가 카드처럼 가격 자리 아래에 안내 한 줄을 더하는 절충으로 처리.
- 카드 라벨 용어는 홈과 요금제에서 `구성 / 라이브 / 회화 콜 / 수강료` 한 벌로 통일(prep-house 의 홈·주문 페이지 용어 불일치는 따르지 않음).
- 요금제 페이지는 상위 단계를 위에 크게(프리미엄 전체 폭, 그 아래 스탠다드·베이직), 홈 요약은 베이직부터 3열. 홈은 비교, 요금제 페이지는 선택이 목적이라서.
- 과목 페이지에는 가격을 두지 않음(벤치마크 15번, 설득은 상세 페이지, 거래는 요금제 페이지).
- 히어로는 가운데 정렬로 바꾸되 크기는 최대 48px. HANDOFF 7.3 의 좌측 정렬과 다르지만 사용자가 벤치마킹 범위를 디자인까지로 넓혔음. ¿ ? 장치와 문구는 유지.
- 푸터는 어두운 배경으로 바꾸되 글자 대비는 흰색 70% 이상(prep-house 의 30% 는 접근성 미달이라 따르지 않음). 사업자 정보 열은 없음.
- before/after 캡처는 `scripts/screens.mjs`(홈, 과목, 요금제, /en 을 390·1280), 나란히 비교는 `scripts/compare-screens.mjs` 로 만듦. 서버는 `next start` 로 `http://localhost:3000`.
- 라벨 폭은 라벨 글자(0.8em) 기준 4.53125em(카드 16px 기준 58px). em 기준이 라벨 자신의 글자 크기라 3.625em 이면 46px 가 됨.
- 영어 라벨 폭은 5.3125em(68px). Includes 같은 영어 라벨이 58px 에서 넘칠 수 있어서.
- 보조값은 inline-block 으로 두어 넘치면 통째로 다음 줄로. 모바일에서 마지막 글자만 떨어지는 줄바꿈 방지.
- 스탠다드 표시는 윗막대 대신 azul 2px 테두리. 둥근 카드 위 막대는 초승달처럼 보이고, 카드 테두리는 하단 버튼 배경에 가려져서.
- 요금제 카드 하단 2분할(결제 준비 중 disabled, 수강신청 링크)은 공용 .btn 대신 새 .card-action 클래스. 공용 버튼 크기와 반경 보호.
- 요금제 페이지 하단 '수강신청으로 이용하기'와 안내 문구는 지우지 않고 가운데 정렬로 유지(기존 문구 삭제 금지).
- PageHead 기본값은 기존 흰 띠 왼쪽 정렬, 요금제만 align="center". 신청, 공지, 라이브, 약관은 범위 밖이라 그대로.
- 섹션 간격은 .sec 위아래 패딩 합으로 모바일 56px, 데스크톱 96px. 각각 96px 이면 섹션 사이 192px 로 과함(벤치마크 9장 권고 96~120px).
- 홈 섹션 제목과 리드는 가운데 정렬로 통일(가운데 정렬 히어로와 리듬). 강사, 공지 블록은 자체 레이아웃이라 제외.
- 과목 페이지 상단 띠의 6px 위 테두리를 언어 점 표시로 바꿈. 카드와 같은 언어 표시 장치를 한 벌로 쓰려고.
- 과목 카드 '구성' 보조값은 '1단원 {첫 단원}' 형식. 영어에서도 어색하지 않음.
- 푸터 문의는 이메일 설정이 있을 때만 열을 만들고, 없으면 2열. 워드마크는 Logo.tsx 를 고치지 않고 흰색으로 따로 그림.
- 과목 카드 hover 는 azul/40 1px 링. 테두리·그림자 없는 카드에서도 누를 수 있다는 신호.
- 헤더 드롭다운과 모바일 메뉴의 언어 표시를 세로 막대에서 원형 점으로(과목 카드와 통일).
- (A-3 검증 반영) prep-house 캡처 32장은 제3자 저작물이라 `.gitignore` 로 저장소에서 제외하고 로컬 참고용으로만 둠. 분석 문서 17장의 파일명 대응표는 그대로.
- (A-3 검증 반영) 관리자, My Class 도 같은 레이아웃이라 새 헤더(스크롤 축소)와 어두운 푸터를 함께 씀. 사이트 전체 틀은 한 벌이 맞다고 보고 유지. 퀴즈 타이머 고정 위치는 데스크톱 축소 헤더 높이(56px)에 맞춤.
- (A-3 검증 반영) 요금제 페이지의 프리미엄 카드만 어두운 바탕(ink). 벤치마크 5장 ALL PACK 처럼 최상위 단계를 플래그십 패널로 구분하는 예외이고, 나머지 카드는 흰 카드 규칙 그대로.
- (A-3 검증 반영) 결제 안내 문구는 카드마다 반복하지 않고 프리미엄 카드에 한 번만. 페이지 리드가 같은 내용을 이미 말하고, 각 카드에는 disabled '결제 준비 중' 버튼이 남아 있음.

## 서버 위치
- Supabase 리전은 서울, Vercel 함수 리전도 `vercel.json` 으로 서울(`icn1`). Vercel 기본값은 미국 동부(iad1)라 한국, 스페인 모두에서 느려짐. 사이트 서버와 DB 를 같은 곳에 둬야 페이지마다 여러 번 오가는 DB 조회가 짧아짐.
- 서울을 고른 이유: 한국 학생에 미성년(내신)이 포함되어 개인정보를 국내에 두는 편이 처리방침이 단순함. 한국은 EU 적정성 결정을 받은 나라라 스페인 학생 데이터를 서울에 둬도 GDPR 상 이전 근거가 있음. 영상(YouTube)과 회화 콜·라이브(Google Meet)는 서버 위치와 무관하게 각 서비스의 가까운 서버로 연결됨. 스페인 쪽 체감 지연은 클릭당 약 0.3초 수준으로 예상.

## Step B Supabase 설정 (내장 브라우저로 진행, 2026-10-26)
- 프로젝트 `vita-language`, 리전 Northeast Asia (Seoul). 생성 화면의 "Automatically expose new tables" 는 끔(마이그레이션이 테이블마다 grant 를 명시하고 시퀀스가 없음을 확인), "Enable automatic RLS" 는 켬(0001 이 20개 테이블 모두 RLS 를 켜므로 결과 같음, 이후 실수 방지).
- SQL 은 0001, 0003, 0002, seed 순으로 적용됨. 0002 실행이 Supabase 의 "파괴적 작업" 확인창에서 멈춘 것을 함수 목록 조회로 발견해 다시 실행. 0002 는 함수만 만들고 0003 은 0002 함수에 의존하지 않아 결과는 정해진 순서와 같음. 확인 결과: 테이블 20(RLS 20), categories 4, tiers 3, admin_* 함수 7, 수강신청 대기 유니크 인덱스, 게시글 수정 컬럼 권한 3.
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`(test-app.sh 의 플래그 빌드). Site URL 은 기본값 `http://localhost:3000`.
- 메일 템플릿(SETUP 1-6) 은 건너뜀: Supabase 가 이제 사용자 SMTP 를 연결해야 템플릿을 고칠 수 있게 함. 기본 템플릿이면 매직링크는 요청한 같은 브라우저에서 열어야 함(로그인 화면 안내문 있음). Supabase 기본 메일은 시간당 발송 수가 아주 적어서 학생 초대 전(Step E)에 SMTP(예: Resend) 연결이 필요.
- 키는 레거시 anon, service_role 을 씀(`@supabase/ssr` 0.5.2 기준으로 검증된 방식). 새 publishable/secret 키 전환은 나중 과제.
- 미들웨어는 링크 prefetch 요청에서 세션 토큰이 달라도 로그아웃과 쿠키 삭제를 하지 않음. 백그라운드 요청이 쿠키를 지우면 다음 이동에서 other_device 안내 없이 일반 로그인 화면으로 가서(13.3-2). 페이지와 서버 액션은 getViewer 가 같은 비교로 막으므로 prefetch 헤더로 우회할 수 없음.
- 실제 Supabase E2E(app)는 기다림을 expect 30초, 테스트 180초로 늘림. 개발 PC 에서 서울 DB 왕복이 회당 0.4~2초라 서버 액션 한 번이 10초를 넘김. 운영은 Vercel icn1 과 같은 리전이라 해당 없음.
- 같은 폼을 연달아 제출하는 E2E 단계는 제출 응답과 화면 행 수 증가까지 기다린 뒤 다음 입력을 시작함(submitAction). 앞 제출의 폼 초기화가 뒤에 입력한 값을 덮어쓰는 경쟁 때문. 앱 코드 문제는 아님(공개 목록의 published 필터는 이미 있음).
- Google 로그인: Google Cloud 프로젝트 `vita-language`, Google Auth Platform 앱 이름 Vita Language, 사용자 유형 External, 게시 상태 Testing. 테스트 사용자에 운영자 계정 1개 등록. OAuth 클라이언트(웹) 리디렉션 URI 는 `https://uikntymdnkuogwncjakk.supabase.co/auth/v1/callback` 하나. Supabase Google 공급자 켜고 Client ID 입력, Client Secret 은 사용자가 직접 입력. 학생 초대 전(Step E)에 앱을 Production 으로 게시해야 테스트 사용자 외에도 로그인됨(이름, 이메일만 쓰므로 Google 검수 대상 아님으로 예상, 게시 때 확인).

## Step E 약관, 개인정보처리방침, 학생 안내
- `/terms`, `/privacy` 본문은 `content/legal.ts`(한/영), 화면은 `components/LegalDoc.tsx`. 문의처는 `NEXT_PUBLIC_CONTACT_EMAIL` 이 있으면 이메일, 없으면 Q&A 게시판 안내 문장. 시행일은 "정식 공개일" 자리표시.
- 두 문서는 운영자 검토용 초안이다. 학생 초대 전에 사람이(가능하면 법률 전문가가) 검토해야 함. 특히 보관 기간(탈퇴 후 5일, 종료 후 30일), 국외 이전 표기, 만 14세 미만 보호자 동의 절차, 보호책임자 성명 기재 여부.
- 학생 안내 인쇄본은 `docs/student-guide.html`(A4, 한국어 1쪽 + 영어 1쪽)을 `node scripts/student-guide-pdf.mjs` 로 `docs/student-guide.pdf` 로 만든다. md 를 고치면 html 도 같이 고칠 것. 배포 주소가 정해지면 `<배포 후 주소>` 를 세 파일 모두에서 바꾸고 PDF 를 다시 만든다.

## 관리자 지정 (2026-10-27)
- 사용자가 Google, 메일 링크로 로그인한 뒤 지정한 계정 1개를 admin, approved 로 바꿈. SQL Editor 대신 service_role REST PATCH 사용, 결과 행 1개 확인.

## Step C Cal.com (2026-10-27)
- 이벤트 4개 slug 를 과목 slug 와 같게 둠(es-conversation, es-school, ko-conversation, topik). 환경변수와 짝이 바로 보이게.
- 위치는 Google Meet 하나만. 웹훅이 meet.google.com 주소만 받으므로 기본값 Cal Video 는 제거.
- 웹훅은 공개 주소가 필요해서 Step D 배포 뒤로 미룸. 로컬 터널(ngrok 등)은 계정이 하나 더 필요해서 쓰지 않음.

## Step D 배포 (2026-10-27)
- Vercel 팀 Vita Language(Hobby), 프로젝트 vita-language, 운영 주소 https://vita-language.vercel.app. 함수 리전 icn1 확인.
- 환경변수는 붙여 넣기에서 키가 중복되어 Import .env 로 넣음. `NEXT_PUBLIC_CONTACT_EMAIL` 은 값이 비어 있어 넣지 않음(빈 값이면 약관 문의처가 Q&A 안내로 나옴). 공개할 주소가 정해지면 추가 후 재배포.
- Supabase Site URL 을 운영 주소로, Redirect URLs 에 운영 `/auth/callback` 추가. 로컬 3000, 3001 은 개발과 E2E 용으로 유지.
- Google OAuth 클라이언트는 그대로. 리디렉션이 Supabase 주소를 거치므로 운영 도메인 추가가 필요 없음.
- Cal.com 웹훅은 생성, 취소, 변경 3개만 구독. 비밀값은 `.env.local` 에서 클립보드로 복사해 사용자가 직접 붙여 넣음(화면, 채팅에 노출 없음).
- 운영 웹훅 확인은 `scripts/cal-webhook-test.mjs` 를 운영 URL 로 실행. 테스트 행은 고정 uid `prodcheck-created` 로 만들고 바로 삭제. 관리자 계정은 수강 등록이 없어 상태가 over_limit 으로 저장됨(정상 동작).
- 학생 안내문 md, html, pdf 의 주소 자리표시를 운영 주소로 바꿈.

## Google 앱 게시 준비 (2026-10-27)
- 게시 버튼이 브랜딩 미완성으로 비활성이라 브랜딩에 홈(`https://vita-language.vercel.app`), 개인정보처리방침(`/privacy`), 이용약관(`/terms`), 승인된 도메인 `vita-language.vercel.app` 을 추가하고 저장. 로고는 넣지 않음(로고가 있으면 Google 브랜드 검수 대상이 됨).
- 게시(Publish app) 클릭은 운영 반영 성격이라 사용자가 직접 누름. 2026-10-27 In production 확인. 이름, 이메일 기본 범위만 써서 100명 한도(민감 범위용)는 해당 없음.
