# PROGRESS

마지막 갱신: 2026-10-26

| Phase | 상태 | 수용 테스트 | 비고 |
|---|---|---|---|
| P1 공개 페이지 | 기능 완료, 독립 검증 완료 | 13.1 17/17 PASS (`bash scripts/test-p1.sh`) | 검증 결함 D1~D10 수정. prep-house 디자인 벤치마킹은 Cowork 에서 (NEXT_STEPS Step A) |
| P2 DB | 완료 | 부록 C 60/60, 앱 수준 37/37, 보안 25/25 PASS (`npm run test:db`) | 0002(관리자 함수), 0003(보안 보강) 추가 |
| P3 로그인·세션 | 구현 완료, 독립 검증 결함 수정, E2E 대기 | `tests/e2e/p3-auth.spec.ts` (실제 Supabase 필요) | |
| P4 강의·수강신청 | 구현 완료, 독립 검증 결함 수정, E2E 대기 | `tests/e2e/p4-courses.spec.ts` | |
| P5 문제 | 구현 완료, 독립 검증 결함 수정, E2E 대기 | `tests/e2e/p5-quiz.spec.ts` | |
| P6 콜·라이브 | 구현 완료, 독립 검증 결함 수정, E2E 대기 | `tests/e2e/p6-calls.spec.ts` | |
| P7 게시판 | 구현 완료, 독립 검증 결함 수정, E2E 대기 | `tests/e2e/p7-board.spec.ts` | |
| P8 전체 점검 | 완료, 수정 반영 | `logs/build/p8-check.md` | 남은 Medium 1, Low 9 수정. 13.3~13.7 은 실제 Supabase 필요 |
| P9 보안 리뷰 | 완료, 수정 반영 | `logs/build/p9-security.md` | High 2, Medium 4, Low 4 모두 수정 (P9-7 은 페이지·액션 단 검사 추가로 보강) |
| P10 배포 | 대기 | | |

## 테스트 실행
- P1: `bash scripts/test-p1.sh` (tsc, eslint, 미연결 빌드 2개, Playwright)
- P2: `PGHOST=/tmp PGPORT=54329 PGUSER=postgres npm run test:db` (로컬 PostgreSQL 16, postgres 권한)
- P3~P7: `bash scripts/test-app.sh` (`.env.local` 에 Supabase 키, 실제 프로젝트에 테스트 데이터를 만들고 지움)
- Cal.com 웹훅 수동 확인: `CAL_WEBHOOK_SECRET=... node scripts/cal-webhook-test.mjs created <user_id>`

## 다음 단계
`NEXT_STEPS.md` (Step A~E), Cowork 시작 프롬프트 `COWORK_PROMPT.md`

## 이 세션에서 막힌 것
- 실제 Supabase 가 없어 P3~P7 E2E 를 실행하지 못함. 로컬 대체 스택(Supabase Auth, PostgREST 바이너리)은 실행 권한이 거부됨.
- 네트워크 정책이 `*.supabase.co`, `api.cal.com`, `vercel.com`, `www.prep-house.co.kr` 을 막음.
- GitHub push 403. 커밋은 로컬에만 있음.

## 사람이 할 일
`docs/SETUP.md` 참고. 요약:
1. GitHub 다시 연결, 저장소에 Claude GitHub App 설치 (push 용)
2. Supabase 프로젝트 생성, SQL 3개 실행, Auth 설정, Google OAuth
3. 키를 `.env.local`(본인 PC) 또는 클라우드 환경변수 + `<ref>.supabase.co` 도메인 허용(새 세션)
4. prep-house 벤치마킹 자료: 도메인 허용 또는 스크린샷 업로드

## 알려진 문제
- HANDOFF 15장 그대로.
- Cal.com 실제 payload 필드명은 연결 후 테스트 웹훅으로 확인 필요 (10.3).
