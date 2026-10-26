# PROGRESS

마지막 갱신: 2026-10-26

| Phase | 상태 | 수용 테스트 | 비고 |
|---|---|---|---|
| P1 공개 페이지 | 기능 완료, 독립 검증 완료 | 13.1 17/17 PASS (`bash scripts/test-p1.sh`) | 검증 결함 D1~D10 수정 |
| Step A prep-house 벤치마킹 | 완료, 독립 검증 13/13 PASS | 13.1 17/17 PASS, tsc, lint, build 오류 0 | 분석 `logs/build/benchmark-prephouse.md`, 전후 캡처 `logs/build/screens/before`, `after`, `compare` (390·1280). 섹션 순서 유지, 테스트 기대값 변경 없음 |
| P2 DB | 완료 | 부록 C 60/60, 앱 수준 37/37, 보안 25/25 PASS (`npm run test:db`) | 0002(관리자 함수), 0003(보안 보강) 추가 |
| P3 로그인·세션 | 완료, 실제 Supabase E2E 통과 | `bash scripts/test-app.sh` 32/32 PASS (2026-10-26) | |
| P4 강의·수강신청 | 완료, 실제 Supabase E2E 통과 | `bash scripts/test-app.sh` 32/32 PASS (2026-10-26) | |
| P5 문제 | 완료, 실제 Supabase E2E 통과 | `bash scripts/test-app.sh` 32/32 PASS (2026-10-26) | |
| P6 콜·라이브 | 완료, 실제 Supabase E2E 통과 | `bash scripts/test-app.sh` 32/32 PASS (2026-10-26) | |
| P7 게시판 | 완료, 실제 Supabase E2E 통과 | `bash scripts/test-app.sh` 32/32 PASS (2026-10-26) | |
| P8 전체 점검 | 완료, 수정 반영 | `logs/build/p8-check.md` | 남은 Medium 1, Low 9 수정. 13.3~13.7 은 실제 Supabase 필요 |
| P9 보안 리뷰 | 완료, 수정 반영 | `logs/build/p9-security.md` | High 2, Medium 4, Low 4 모두 수정 (P9-7 은 페이지·액션 단 검사 추가로 보강) |
| P10 배포 | 대기 (Vercel 가입 필요) | | Vercel 리전 icn1 고정(`vercel.json`) |
| Step E 학생 초대 준비 | 일부 완료 | tsc, lint, build 오류 0, P1 17/17 | 약관·개인정보처리방침 한/영 초안(`content/legal.ts`, 사람 검토 필요), 학생 안내문 1쪽×2 PDF(`docs/student-guide.pdf`, 배포 주소 비어 있음). 남은 것: 메일 SMTP, Google 앱 Production 게시, 강의·레슨·문제 등록 |

## 테스트 실행
- P1: `bash scripts/test-p1.sh` (tsc, eslint, 미연결 빌드 2개, Playwright)
- P2: `PGHOST=/tmp PGPORT=54329 PGUSER=postgres npm run test:db` (로컬 PostgreSQL 16, postgres 권한)
- P3~P7: `bash scripts/test-app.sh` (`.env.local` 에 Supabase 키, 실제 프로젝트에 테스트 데이터를 만들고 지움)
- Cal.com 웹훅 수동 확인: `CAL_WEBHOOK_SECRET=... node scripts/cal-webhook-test.mjs created <user_id>`

## 다음 단계
`NEXT_STEPS.md` (Step A~E), Cowork 시작 프롬프트 `COWORK_PROMPT.md`

## 이 세션에서 막힌 것
- (해결) P3~P7 E2E 는 Step B 에서 실제 Supabase(서울, vita-language)로 32/32 통과.
- 네트워크 정책이 `*.supabase.co`, `api.cal.com`, `vercel.com`, `www.prep-house.co.kr` 을 막음.
- (클라우드 세션) GitHub push 403. Windows 로컬 세션에서 push 재시도.

## 사람이 할 일
`docs/SETUP.md` 참고. 요약:
1. GitHub 다시 연결, 저장소에 Claude GitHub App 설치 (push 용)
2. (완료) Supabase 프로젝트, SQL 4개, URL 설정. 남은 것: Google OAuth, 메일 SMTP(학생 초대 전)
3. 키를 `.env.local`(본인 PC) 또는 클라우드 환경변수 + `<ref>.supabase.co` 도메인 허용(새 세션)

## 알려진 문제
- HANDOFF 15장 그대로.
- Cal.com 실제 payload 필드명은 연결 후 테스트 웹훅으로 확인 필요 (10.3).
