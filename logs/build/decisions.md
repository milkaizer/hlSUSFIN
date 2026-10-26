# 결정 기록

HANDOFF.md 와 다르게 정했거나, 문서에 없어서 정한 것. 한 줄에 하나.

## P1
- 작업 폴더: `C:\VitaLanguage` 대신 이 저장소 루트(클라우드 리눅스 컨테이너). 폴더 구조(4장)는 그대로.
- `@playwright/test` 1.56.0 대신 1.63.0: 컨테이너에 미리 깔린 Chromium(1.63.0용)과 맞추려고. 다른 버전이면 브라우저를 새로 받아야 함.
- 의존성은 2.2 버전을 정확히 고정(`next 15.5.28`, `react 19.1.10`, `next-intl 3.26.5`, `@supabase/ssr 0.5.2`). 캐럿 범위로 두면 보안 패치 기준이 흐려짐.
- `next.config.ts` 에 `distDir: process.env.NEXT_DIST_DIR || ".next"` 추가: 13.1 테스트용 빌드(미연결 `.next-p1`, 플래그 on `.next-flags`)를 운영 빌드 `.next` 와 나눠 두려고. 운영에는 영향 없음.
- next-intl 로케일 자동 감지(기본값 on) 유지: 브라우저 언어가 영어인 세종학당 수강생은 `/` 에서 `/en` 으로 간다. 그래서 E2E 는 `locale: ko-KR` 브라우저로 돈다.
- `LocalTime` 은 서버에서 서울 시간으로 그린 뒤 브라우저에서 로컬 시간대로 다시 그린다(하이드레이션 불일치 방지).
- 로그인 화면에 매직링크 같은 브라우저 안내문(`login.sameBrowser`) 추가(함정 12).
- 로그아웃 폼이 `locale` 을 보내서 영어 화면에서 로그아웃하면 `/en` 으로 간다.
- 메시지 키 추가(부록 D 기준 + 화면에 필요한 것): `nav.main`, `nav.home`, `course.lang_*`, `pricing.included/notIncluded`, `apply.noRequests/blocked`, `login.sending/sameBrowser/invalidEmail`, `live.upcoming/loginToSee`, `myclass.*` 일부, `quiz.*` 일부, `common.*Body`.
- 구현은 메인 에이전트, 검증은 Phase 마다 새 서브에이전트(구현 내용을 모르는 상태에서 파일과 실행 결과로만 확인).

## 테스트 환경
- 1순위(Docker + Supabase CLI) 불가: dockerd 는 뜨지만 이미지 레지스트리(Docker Hub 429, ECR 한도, ghcr blob 403)가 막혀 있음.
- P2 는 2순위(로컬 PostgreSQL 16 + 부록 C 스텁)로 실행.
- P3 이후 E2E 는 GitHub 릴리스 바이너리로 받은 Supabase Auth(GoTrue)와 PostgREST 를 로컬 Postgres 16 에 붙이고, `/auth/v1`, `/rest/v1` 을 나눠 주는 작은 게이트웨이로 Supabase API 를 재현해서 실행. Google OAuth 는 로컬에서 검증 불가라 실제 Supabase 연결 후 확인.
