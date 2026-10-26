# Vita Language: 현재 상태와 다음 단계

작성: 2026-10-26 (Claude Code 클라우드 세션에서 Cowork 로 넘기며 작성)
저장소: `github.com/milkaizer/hlSUSFIN`, 브랜치 `claude/proceed-as-is-rus4o2`

---

## 1. 지금까지 된 것

| Phase | 상태 | 확인 방법과 결과 |
|---|---|---|
| P1 공개 페이지 | 기능 완료, 독립 검증 완료 | `bash scripts/test-p1.sh`: 13.1 Playwright 17/17 PASS. 검증 보고서 `logs/build/p1-verify.md` 의 D1~D10 수정 |
| P2 DB | 완료 | `npm run test:db`: 부록 C 60/60, 앱 수준 37/37, 보안 19/19 PASS (로컬 PostgreSQL 16) |
| P3 로그인·1계정 1세션·관리자 회원 | 구현 완료, E2E 대기 | 실제 Supabase 가 없어 `tests/e2e/p3-auth.spec.ts` 미실행 |
| P4 수강신청·My Class·레슨 | 구현 완료, E2E 대기 | `tests/e2e/p4-courses.spec.ts` 미실행 |
| P5 문제·모의고사·채점 | 구현 완료, E2E 대기 | `tests/e2e/p5-quiz.spec.ts` 미실행 |
| P6 회화콜·라이브·캘린더 | 구현 완료, E2E 대기 | `tests/e2e/p6-calls.spec.ts` 미실행 |
| P7 공지·Q&A·합격자·단계 설정 | 구현 완료, E2E 대기 | `tests/e2e/p7-board.spec.ts` 미실행 |
| P8 전체 재점검 | 진행 중 | 보고서가 `logs/build/p8-check.md` 로 브랜치에 올라감 (없으면 아직 진행 중이었던 것) |
| P9 보안 리뷰 | 완료, 전부 수정 | `logs/build/p9-security.md`. High 2, Medium 4, Low·Info 4 수정 |
| P10 배포 | 미착수 | 사람 선행 작업 필요 |

P3~P7 은 tsc, eslint, next build 오류 0 이고, 독립 검증 에이전트가 코드와 SQL 재현으로 확인했다(`logs/build/p3-p7-verify.md`). 실제 브라우저 E2E 만 남았다.

### HANDOFF 와 달라진 중요한 점 (자세한 이유는 `logs/build/decisions.md`)
- DB 마이그레이션이 3개다. Supabase SQL Editor 에서 `0001_init.sql`, `0002_admin_functions.sql`, `0003_security.sql`, `seed.sql` 순서로 실행해야 한다. 0002, 0003 이 없으면 Q&A 작성, 관리자 문항 편집, 보안 보강이 빠진다.
- 로케일 자동 감지를 껐다. `/` 는 항상 한국어, `/en` 은 영어.
- `/auth/callback` 이 `token_hash` 매직링크도 받는다. 메일 템플릿을 바꾸면 다른 브라우저에서 링크를 열어도 로그인된다(`docs/SETUP.md` 1-6).
- 1계정 1세션 검사를 미들웨어뿐 아니라 `lib/auth.ts` 의 `getViewer` 에서도 한다.
- Cal.com 웹훅은 예약자 이메일이 회원 이메일과 같을 때만 그 회원의 크레딧을 쓴다. 나머지는 "확인 필요"(`over_limit`).
- `@playwright/test` 는 1.63.0 (클라우드 컨테이너 브라우저에 맞춤). 다른 PC 에서는 `npx playwright install chromium` 한 번 필요.

---

## 2. 남은 일 (순서대로)

### Step A. prep-house 벤치마킹으로 공개 페이지 형식과 디자인 다시 잡기 (사용자 요청)
- 사용자 요청: https://www.prep-house.co.kr/home 의 **홈페이지 형식과 디자인**을 벤치마킹. (HANDOFF 1.4 는 "정보 배치와 흐름만"이었으나 사용자가 디자인까지로 바꿈)
- 클라우드 세션에서는 이 사이트가 네트워크 정책에 막혀 못 봤다. Cowork 의 내장 브라우저로 직접 열어 분석한다.
- 지켜야 할 선: 레이아웃, 섹션 구성과 순서, 카드 구조(구성·기간·가격을 한 틀에), 정보 밀도, 타이포 위계, 색 쓰는 방식, 컴포넌트 형태는 참고. **로고, 사진, 일러스트, 문구, 브랜드 색을 그대로 가져오지는 않는다.**
- 대상 화면: 홈(`app/[locale]/page.tsx`, `components/home/*`), 과목(`app/[locale]/courses/[category]/page.tsx`), 요금제(`app/[locale]/pricing/page.tsx`, `components/TierCards.tsx`), 헤더·푸터(`components/NavBar.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`), 디자인 토큰(`tailwind.config.ts`, `app/globals.css`).
- 관리자 화면과 My Class 는 토큰과 공용 클래스(`.btn-*`, `.panel`, `.field`)를 쓰므로 토큰을 바꾸면 같이 바뀐다.
- 섹션 순서가 HANDOFF 6.1 과 달라지면 `tests/e2e/p1-public.spec.ts`, `p1-flags.spec.ts` 의 `data-section` 기대값도 같이 고치고 `logs/build/decisions.md` 에 이유를 남긴다.
- 합격자·후기 스페이서(플래그), 결제 버튼 disabled, 사업자 정보 없는 푸터, em-dash 금지, 390px 가로 스크롤 0 은 그대로 유지.
- 완료 조건: `bash scripts/test-p1.sh` 전부 PASS, 390px·1280px 스크린샷을 `logs/build/screens/` 에 다시 저장.

### Step B. Supabase 연결 (사람 작업 후 E2E)
1. 사람: `docs/SETUP.md` 1장대로 Supabase 프로젝트 생성, SQL 4개 실행, Auth 설정, Google OAuth, 본인 계정 관리자 지정.
2. 사람: 프로젝트 폴더에 `.env.local` 작성 (`.env.example` 참고). 키는 채팅에 붙여 넣지 않는다.
3. `bash scripts/test-app.sh` 실행. 실제 프로젝트에 `vita-e2e-...@example.com` 테스트 사용자와 `E2E ...` 이름의 데이터를 만들고 끝나면 지운다.
4. 실패하면 원인을 고치고 재실행. 13.3~13.7 표를 PROGRESS.md 에 기록.
5. 사람이 직접 확인할 것: Google 로그인 1회, 실제 매직링크 메일 1회.

### Step C. Cal.com 연결
- `docs/SETUP.md` 3장. 과목별 15분 이벤트 4개, 웹훅 URL `https://<도메인>/api/cal/webhook`, 시크릿을 `CAL_WEBHOOK_SECRET` 에.
- 테스트 웹훅(Ping)과 실제 예약 1건으로 payload 필드명을 확인하고 다르면 `app/api/cal/webhook/route.ts` 를 맞춘다(HANDOFF 10.3).

### Step D. 배포 (P10, HANDOFF 13.8)
- Vercel 에 저장소 import, 환경변수 입력, 배포. Supabase Site URL, Redirect URLs, Google OAuth, Cal.com 웹훅 URL 을 운영 주소로 갱신.
- 배포 URL 스모크: 홈, 로그인, 승인, 레슨, 퀴즈 제출. 배포 도메인에서 Google 로그인.

### Step E. 학생 초대 전
- `docs/student-guide.md` 의 `<배포 후 주소>` 채우기. 1쪽 PDF 나 문서로 만들어 배포.
- `app/[locale]/terms`, `privacy` 실제 문구 (미성년 포함, 수집 항목과 보관 기간).
- 강의 1개 이상, 레슨 몇 개, 문제 세트 1개 등록.

---

## 3. 명령 모음

| 목적 | 명령 |
|---|---|
| 의존성 | `npm install` (Playwright 브라우저: `npx playwright install chromium`) |
| 개발 서버 | `npm run dev` 후 `http://localhost:3000` (127.0.0.1 로 접속하지 않기, HANDOFF 함정 4) |
| 타입·린트·빌드 | `npx tsc --noEmit`, `npm run lint`, `npm run build` |
| 13.1 공개 페이지 | `bash scripts/test-p1.sh` (Windows 는 Git Bash 또는 WSL) |
| DB 수용 테스트 | `PGHOST=... PGPORT=... PGUSER=postgres npm run test:db` (로컬 PostgreSQL 16 필요) |
| 13.3~13.7 E2E | `bash scripts/test-app.sh` (`.env.local` 에 Supabase 키) |
| Cal.com 가짜 웹훅 | `CAL_WEBHOOK_SECRET=... node scripts/cal-webhook-test.mjs created <user_id>` |

## 4. 주요 문서
- `HANDOFF.md`: 원래 명세 (결정, 화면, 데이터 모델, 수용 테스트)
- `PROGRESS.md`: Phase 표
- `logs/build/decisions.md`: HANDOFF 와 다르게 정한 것과 이유
- `logs/build/p1-verify.md`, `p3-p7-verify.md`, `p9-security.md`, `p8-check.md`: 독립 검증 보고서
- `docs/SETUP.md`: 사람이 할 일 (Supabase, Cal.com, Vercel)
- `docs/student-guide.md`: 학생 안내 초안 (한/영)
