# Vita Language 핸드오프 (Claude Code용)

작성일: 2026-10-26
대상: Claude Code. 이 파일 하나만 읽고 처음부터 끝까지 빌드할 수 있게 썼다.
부록 A~E는 이전 시도에서 **실제로 실행해 검증한 코드**다. 그대로 써도 되고, 더 나은 방법이 있으면 바꿔도 된다. 단, 바꾸면 부록 C의 DB 수용 테스트를 다시 통과시켜야 한다.

---

## 0. 시작 방법

### 0.1 사람이 할 일
1. `C:\VitaLanguage` 폴더를 만들고 이 파일을 `HANDOFF.md`로 넣는다
2. 그 폴더에서 Claude Code를 연다
3. 아래 킥오프 프롬프트를 붙여 넣는다

### 0.2 킥오프 프롬프트
```
HANDOFF.md를 처음부터 끝까지 읽고 12장 Phase 순서대로 진행해줘.
- 한 Phase가 끝날 때마다 13장 해당 수용 테스트를 직접 실행하고 결과표를 보여준 뒤 다음 Phase로 넘어가
- 구현과 검증은 서브에이전트를 나눠서 써. 검증 서브에이전트는 구현 결과를 믿지 말고 파일과 실행 결과로 확인
- 계정 생성, 비밀키, 결제처럼 내가 해야 하는 일은 멈추고 정확히 무엇을 해야 하는지 단계별로 알려줘
- 그 밖에 판단이 필요한 건 질문하지 말고 HANDOFF.md 기준으로 결정하고 logs/build/에 적어
- 각 Phase 끝에 git commit, PROGRESS.md 갱신
```

### 0.3 Claude Code 운영 규칙
- 이 문서의 결정을 바꿀 때는 `logs/build/decisions.md`에 이유를 한 줄로 남긴다
- UI 문구와 문서에 em-dash(U+2014) 금지. 번역체 금지. 과도한 이모지 금지
- UI 작업 전 frontend-design 스킬이 있으면 읽는다
- 비밀값은 `.env.local`에만. `.env.example`에는 키 이름만. 커밋 금지
- Phase 끝마다 `npm run build`, `npm run lint`, `npx tsc --noEmit` 오류 0

---

## 1. 프로젝트 요약

### 1.1 무엇
- 이름: **Vita Language**
- 과목별 온라인 강의, 문제풀이, 모의고사, 15분 1:1 회화 콜 예약, 라이브 수업(Google Meet), 과목별 Q&A를 한 사이트에서 운영
- 과목 4개: 스페인어 회화, 스페인어 내신, 한국어 회화, TOPIK

### 1.2 누가 쓰나
- 1차 사용자: 기존 스페인어 과외 학생 약 8명 + 세종학당 수강생 (외국인 한국어 학습자)
- 그래서 UI는 한국어 기본 + 영어

### 1.3 이번 빌드의 성격: 무료 테스트 런치
- **결제 없음.** 학생이 수강신청하면 관리자가 승인하고 권한을 직접 부여
- **결제는 스페이서**: 인터페이스와 자리만 만들고 동작하지 않음
- **합격자·성과, 수강후기는 스페이서**: 테이블과 관리자 입력 화면은 만들고, 공개 화면은 환경변수 플래그로 숨김. 합격자 데이터는 사용자가 이미 갖고 있어서 나중에 입력 후 플래그만 켜면 됨
- **사업자 정보 푸터 넣지 않음**: 상호, 사업자번호, 주소, 통신판매업 번호 전부 없음

### 1.4 벤치마크
- https://www.prep-house.co.kr/home 의 **정보 배치와 흐름만** 참고 (메뉴 구성, 강의 카드에 구성·기간·가격을 한 틀로 보여주는 방식, 질문형 특징 블록, 패키지 상품, 무통장입금 후 수동 승인 구조)
- 디자인, 문구, 이미지, 색은 복제 금지

### 1.5 범위 밖
- 실제 PG 연동, DRM, 모바일 앱, 카카오 로그인, 이메일 마케팅

---

## 2. 확정된 결정

### 2.1 사용자가 정한 것
| 항목 | 결정 |
|---|---|
| 사이트 이름 | Vita Language |
| 과목 | 스페인어 회화 / 스페인어 내신 / 한국어 회화 / TOPIK |
| 결제 | 테스트 단계엔 없음. 관리자가 권한 부여 |
| 계정 공유 방지 | 한 계정은 한 기기에서만 로그인 |
| 회화 콜 | 15분, 캘린더 예약 |
| 라이브 | Google Meet 링크를 올려서 운영 |
| 합격자 섹션 | 스페이서 (데이터는 있음) |
| 사업자 푸터 | 넣지 않음 |
| 요금제 | 단계별 차등 |

### 2.2 설계 결정 (바꿔도 되지만 이유를 남길 것)
| 항목 | 결정 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 App Router, TypeScript, Tailwind CSS 3 | 무료 호스팅, 서버 액션으로 관리자 폼 단순화 |
| 버전 | `next@15.5.28`, `react@19.1.10`, `react-dom@19.1.10`, `eslint-config-next@15.5.28` | 15.1.x 계열은 미들웨어 우회(CVE-2025-29927) 등 보안 패치 이전. 이 앱은 미들웨어로 세션을 검사하므로 패치 버전 필수 |
| 다국어 | `next-intl@3.26.5`, `ko` 기본(`/`), `en`(`/en`), `localePrefix: "as-needed"` | 세종학당 수강생 |
| DB·인증·권한 | Supabase (Postgres, Auth, RLS), `@supabase/ssr@0.5.x`, `@supabase/supabase-js@2` | 무료 플랜, RLS로 권한을 DB에서 강제 |
| 로그인 | Google OAuth + 이메일 매직링크 | |
| 영상 | 테스트 단계 YouTube 미등록 임베드. `video_provider` 필드로 Vimeo 전환 가능 | 비용 0 |
| 회화 콜 | Cal.com 예약 링크 + 웹훅 | Google Calendar 연동 시 Meet 링크 자동 생성 |
| 라이브 | 관리자가 Meet 링크 직접 입력 | |
| 호스팅 | Vercel | |
| 폰트 | Pretendard (npm `pretendard` 패키지, 로컬 번들) | Google Fonts는 빌드 환경에서 막힐 수 있음 |
| 권한 생성 경로 | DB 함수 `grant_access()` 하나로 통일 | 나중에 결제 웹훅이 같은 함수를 호출하면 끝 |
| 단계 | basic / standard / premium | 아래 2.3 |

### 2.3 단계 초안 (DB `tiers` 시드값, 관리자 화면에서 수정 가능)
| 단계 | 한국어 이름 | 강의·문제·Q&A | 라이브 | 월 회화 콜 | 가격 |
|---|---|---|---|---|---|
| basic | 베이직 | O | X | 0 | null (준비 중) |
| standard | 스탠다드 | O | O | 2 | null |
| premium | 프리미엄 | O | O | 4 | null |

- 단계 순서: basic(1) < standard(2) < premium(3). `min_tier` 비교는 이 순서
- 라이브 노출은 각 라이브의 `min_tier`(기본 standard)로 결정

---

## 3. 이전 시도에서 검증된 것과 알게 된 함정

이전에 채팅 환경에서 S1~S6 범위를 한 번 구현했다. 아래는 그때 확인한 사실이다.

### 3.1 검증 완료
| 항목 | 결과 |
|---|---|
| DB 스키마·RLS·함수 (부록 A) | 로컬 Postgres 16 + auth 스텁에서 수용 테스트 **60/60 PASS** (부록 C) |
| `tsc --noEmit`, `eslint .`, `next build` | 오류 0 |
| 홈 데스크톱 렌더 | 섹션 순서 정상, 디자인 시스템 적용 확인 |

### 3.2 못 한 것 (이번에 해야 함)
- 10.1 자동 테스트 (플래그 on/off, em-dash, 390px 가로 스크롤, 결제 웹훅 501)
- 모바일 스크린샷 검토
- 실제 Supabase 연결 후 로그인부터 끝까지 E2E
- 배포

### 3.3 함정 목록 (같은 실수 반복 금지)
1. **Next 버전**: 15.1.6으로 시작했다가 보안 패치 버전으로 올렸다. 처음부터 2.2의 버전으로 고정
2. **`next lint` 폐기 예정**: ESLint CLI(`eslint .`) + flat config 사용. `next-env.d.ts`는 ignore에 넣는다 (triple-slash 오류)
3. **`@supabase/ssr` 쿠키 타입**: `setAll(list)`의 `list`가 암묵적 any로 tsc 오류. `type CookieList = { name: string; value: string; options: CookieOptions }[]`로 명시
4. **로컬 테스트 리다이렉트 루프**: `next start -H 127.0.0.1`로 띄우고 127.0.0.1로 접속하면 next-intl rewrite 대상 호스트(localhost)와 달라져 `ERR_TOO_MANY_REDIRECTS`. **`-H` 없이 띄우고 `http://localhost:3000`으로 접속**
5. **백그라운드 서버**: 도구 실행이 끝나면 백그라운드 서버가 죽는 환경이 있다. 서버 기동과 테스트를 한 셸 명령 안에서 실행
6. **정적 생성 문제**: Supabase 환경변수가 없으면 `cookies()`가 호출되지 않아 페이지가 SSG로 굳는다. 로그인 상태에 따라 헤더가 바뀌므로 `app/[locale]/layout.tsx`에 `export const dynamic = "force-dynamic"`
7. **403 응답**: `forbidden()`을 쓰려면 `next.config.ts`에 `experimental: { authInterrupts: true }`, 그리고 `app/[locale]/forbidden.tsx`
8. **루트 레이아웃 구조**: `app/layout.tsx`는 children만 반환(전역 CSS import), 실제 `<html>`은 `app/[locale]/layout.tsx`. `app/not-found.tsx`는 자체 `<html>` 포함
9. **PostgREST 임베드 모호성**: `enrollment_requests`는 `profiles`로 가는 FK가 2개(user_id, handled_by). 조인 시 `profiles!enrollment_requests_user_id_fkey(email,name)`
10. **Cal.com 웹훅 재전송**: 같은 `uid`로 재전송되면 자기 자신이 크레딧을 차감한 상태라 `over_limit`으로 잘못 찍힌다. 기존 행이 있고 취소가 아니면 기존 상태 유지
11. **워터마크 한계**: iframe 전체화면에서는 오버레이가 사라진다. 알려진 문제로 기록
12. **매직링크(PKCE)**: 링크를 요청한 같은 브라우저에서 열어야 로그인된다. 로그인 화면 안내문에 반영 고려
13. **Supabase 기본 권한**: Supabase는 public 테이블에 anon/authenticated 기본 권한을 준다. 마이그레이션에서 `revoke all` 후 필요한 것만 grant (부록 A가 그렇게 되어 있음)

---

## 4. 폴더 구조

```
C:\VitaLanguage
├─ HANDOFF.md, PROGRESS.md
├─ app
│  ├─ layout.tsx                 (children만, globals.css import)
│  ├─ not-found.tsx              (자체 html)
│  ├─ globals.css
│  ├─ auth/callback/route.ts     (코드 교환 + 세션 토큰 발급)
│  ├─ auth/signout/route.ts
│  ├─ api/payments/webhook/route.ts  (501 스페이서)
│  ├─ api/cal/webhook/route.ts       (Cal.com 웹훅)
│  └─ [locale]
│     ├─ layout.tsx, page.tsx, not-found.tsx, forbidden.tsx, [...rest]/page.tsx
│     ├─ courses/[category]/page.tsx
│     ├─ pricing, apply(+actions.ts), login(+LoginForm.tsx), live, reviews, terms, privacy
│     ├─ board/page.tsx, board/[id]/page.tsx, board/actions.ts
│     ├─ myclass/page.tsx, myclass/actions.ts
│     ├─ myclass/lesson/[id], myclass/quiz/[id], myclass/attempt/[id]
│     └─ admin/layout.tsx, page.tsx, actions.ts
│        members, members/[id], requests, content, content/[id],
│        quizzes, quizzes/[id], quizzes/QuizFields.tsx, grading, grading/[id],
│        live, calls, board, showcase, settings
├─ components
│  ├─ Logo, SiteHeader(서버), NavBar(클라이언트), SiteFooter, TierCards, LocalTime
│  ├─ home/ Hero, CourseTiles, Features, ResultsSection, ReviewsSection
│  ├─ myclass/ VideoPlayer, Watermark, MonthCalendar, QuizRunner
│  ├─ admin/ui.tsx (H, H2, Notice, Field, Table, TD)
│  └─ ui/Icons.tsx (Check, Cross)
├─ content/ categories.ts, tiers.ts, instructor.ts
├─ i18n/ routing.ts, request.ts
├─ messages/ ko.json, en.json
├─ lib
│  ├─ env.ts, flags.ts, session.ts, safe-next.ts, cal.ts, admin-utils.ts, auth.ts
│  ├─ supabase/ server.ts, client.ts, admin.ts(server-only, service role)
│  ├─ data/ public.ts, student.ts
│  └─ payments/ index.ts, toss.ts
├─ middleware.ts
├─ supabase/ migrations/0001_init.sql, seed.sql, tests/(auth_stub.sql, rls_test.sql, run.sh)
├─ tests/e2e/
└─ logs/build/
```

---

## 5. 정보 구조

### 5.1 상단 메뉴
1. 과목 (드롭다운): 스페인어 회화 / 스페인어 내신 / 한국어 회화 / TOPIK
2. 라이브·회화콜
3. 요금제
4. 수강후기 (플래그 꺼지면 메뉴에서도 숨김)
5. 공지·Q&A
6. 우측: 언어 전환, (관리자면) 관리자, 로그인 또는 My Class + 로그아웃, 강조 버튼 `수강신청`
7. 모바일: 메뉴 버튼으로 펼침. 과목은 2열 그리드

### 5.2 라우트
| 경로 | 접근 | 비고 |
|---|---|---|
| `/` | 공개 | |
| `/courses/[category]` | 공개 | 슬러그 외 값은 404 |
| `/pricing` | 공개 | |
| `/apply` | 공개 화면, 제출은 로그인 | 비로그인이면 폼 비활성 + "로그인 후 신청" |
| `/live` | 공개, 일정 목록은 로그인 | |
| `/board` | 공지 공개, Q&A는 권한자 | `?c=<category>` |
| `/board/[id]` | RLS가 결정 | |
| `/reviews` | 플래그 | false면 404 |
| `/login` | 공개 | `?next=`, `?reason=other_device|failed` |
| `/myclass` | 로그인 | `?tab=courses|quizzes|schedule|calls|questions` |
| `/myclass/lesson/[id]`, `/myclass/quiz/[id]`, `/myclass/attempt/[id]` | 권한자 | 권한 밖이면 404 |
| `/admin/*` | 관리자 | 아니면 403 |
| `/terms`, `/privacy` | 공개 | "초안 준비 중" 자리 |
| `/auth/callback`, `/auth/signout` | | 미들웨어 제외 |
| `/api/payments/webhook` | | 항상 501 |
| `/api/cal/webhook` | | 서명 검증 |

### 5.3 과목 슬러그
`es-conversation`, `es-school`, `ko-conversation`, `topik`

---

## 6. 화면 명세

### 6.1 홈 섹션 순서
1. 공지 배너: 최신 공지 1개. 없으면 렌더 안 함
2. 히어로 (7.3 참조)
3. 과목 카드 4개 (`id="courses"`, 히어로의 "과목 보기"가 여기로 스크롤)
4. 질문형 특징 6개 (부록 D `features`)
5. 요금제 요약: 단계 카드 3개 + "요금제 자세히 보기"
6. **ResultsSection** 합격자·성과 (스페이서)
7. **ReviewsSection** 후기 (스페이서, 홈에선 최대 4개)
8. 강사 소개 1블록: `content/instructor.ts`의 name이 null이면 이름 줄 숨김
9. 공지·Q&A 진입 블록
10. 푸터

### 6.2 과목 페이지
- 상단 밴드: 언어 라벨, 과목명, 한 줄 소개, CTA `이 과목 수강신청`(`/apply?category=<slug>`), `요금제 보기`
- 본문: 대상, 커리큘럼(순서가 있으므로 번호 목록), 사이드: 포함 기능 체크 목록
- 하단: 다른 과목 카드 3개
- 콘텐츠는 부록 E `content/categories.ts`

### 6.3 요금제 페이지
- 리드: 테스트 운영 중이라 온라인 결제 없음, 수강신청 후 승인
- 단계 카드 3개. DB `tiers` 값 우선, 없으면 `content/tiers.ts`
- 가격 null이면 `준비 중`
- 각 카드 하단 결제 버튼 `disabled`, 문구 `결제 준비 중`
- 하단 `수강신청으로 이용하기` 버튼 + "가격과 구성은 정식 오픈 때 확정됩니다."

### 6.4 수강신청
- 과목 select (쿼리 `category`로 기본값), 단계 라디오 3개, 메모(최대 1000자)
- 제출 시 `enrollment_requests` insert (status는 DB가 pending만 허용)
- 성공: `?sent=1` 안내. 실패: `?error=1`
- 아래 "내 신청 내역": 과목, 단계, 상태 배지(확인 중 / 승인됨 / 반려됨)

### 6.5 로그인
- Google 버튼, "또는", 이메일 입력 + `로그인 링크 받기`
- `reason=other_device`면 상단 경고: "다른 기기에서 로그인되어 이 기기는 로그아웃되었습니다. 한 계정은 한 기기에서만 사용할 수 있습니다."
- 하단 정책 문구: 한 계정 한 기기
- Supabase 미설정이면 "로그인 서버가 아직 연결되지 않았습니다"
- `next`는 내부 경로만 허용 (`/`로 시작, `//` 금지)

### 6.6 라이브·회화콜 안내
- 설명 패널 2개 (라이브 / 15분 회화 콜)
- 로그인 시 다가오는 라이브 목록 (RLS로 권한 있는 것만)
- `My Class에서 예약하기` 버튼

### 6.7 공지·Q&A
- 공지 목록 (공개)
- Q&A: 로그인 + 권한 있는 과목만 탭으로 표시. 없으면 "Q&A는 수강생만 볼 수 있습니다"
- 질문 목록: 비공개 배지, 답변 상태 배지(강사 댓글이 있으면 `답변 완료`, 없으면 `답변 대기`)
- 질문 쓰기: 제목, 내용, 비공개 체크
- 글 상세: 본문, 작성자/관리자 삭제, 댓글 목록(강사 댓글은 파란 배경 + `강사 답변` 배지), 댓글 쓰기

### 6.8 My Class
- 승인 대기: "승인 대기 중" + 수강신청 버튼. 차단: "이용이 중지된 계정입니다"
- 탭 5개
  - **내 과목**: 유효 권한별 섹션(과목명, 단계, 만료일). 강의별 레슨 목록, 진도 `n/total 완료`, 레슨별 완료 토글
  - **문제·모의고사**: 유형 배지(연습/모의고사), 과목, 제한 시간, 남은 응시 횟수, 시작/결과 보기
  - **일정**: 월간 캘린더(사용자 로컬 시간 기준, 콜은 파란 점, 라이브는 노란 점) + 이달 목록 + 사이드에 다가오는 라이브 5개(링크는 30분 전부터 `입장하기`)
  - **회화콜 예약**: 과목별 카드에 이번 달 남은 횟수, `15분 콜 예약하기`(Cal.com 링크, 새 탭). 0회면 안내문. 아래 다가오는 예약 + Meet 링크
  - **내 질문**: 내가 쓴 질문 목록

### 6.9 레슨
- 강의명(뒤로), 레슨 제목, 영상(16:9) + 이메일 워터마크, 완료 토글, 자료 링크(https만), 이전/다음 레슨

### 6.10 퀴즈
- 퀴즈 안내: 유형, 시간, 남은 횟수, 시작(진행 중이면 이어서), 지난 응시 목록
- 응시: 상단 고정 타이머(1분 미만 경고색), 문항 카드(객관식 라디오, 복수 체크박스, 단답 input, 서술 textarea), 제출 확인창, 시간 종료 시 자동 제출 + 안내
- 결과: 점수, 서술형 대기 배지, 문항별 내 답/정답/해설/정오(왼쪽 색 띠)

### 6.11 관리자 (한국어 전용)
| 화면 | 기능 |
|---|---|
| 현황 | 승인 대기 회원, 대기 수강신청, 채점 대기, 크레딧 초과 예약, 답변 대기 질문 카운트 카드 |
| 회원·권한 | 상태 필터, 승인/차단 버튼 |
| 회원 상세 | 권한 목록(단계·만료일 수정, 회수), 권한 부여 폼(과목, 단계, 시작일, 만료일, 메모), 회화콜 크레딧 조정(월, 과목, 증감, 메모) |
| 수강신청 | 대기 목록(메모 표시, 시작·만료일 입력 후 `승인하고 권한 부여`, `반려`), 처리 내역 |
| 강의 | 강의 목록, 새 강의 |
| 강의 상세 | 강의 수정, 레슨 목록 인라인 수정(제목, 최소 단계, 순서, 공개, 영상 주소, 자료 링크), 레슨 추가, 삭제 |
| 문제 | 문제 세트 목록, 새 세트 |
| 문제 상세 | 세트 설정, 문항 인라인 수정·추가·삭제 |
| 채점 | 채점 대기 목록, 응시별 서술형 점수 입력 |
| 라이브 | 일정 인라인 수정·추가·삭제 (서울 시간 입력) |
| 회화콜 | 예약 목록, 상태 필터, 회원 매칭 안 된 예약 표시 |
| 게시판 | 답변 대기 질문 목록, 공지 작성 |
| 합격자·후기 | 입력·수정·삭제, 공개 체크. 현재 플래그 상태 표시 |
| 단계 설정 | 월 회화콜 횟수, 가격(비우면 준비 중), 라이브 표시 |

- 관리자 입력 규칙
  - 날짜는 서울 기준. 시작일은 00:00:00+09:00, 만료일은 23:59:59+09:00
  - 영상 입력은 YouTube/Vimeo 주소 또는 ID를 받아 provider와 ID로 파싱
  - 객관식 정답은 1부터 시작하는 번호, 복수는 `1,3`. 저장은 0부터 시작하는 인덱스
  - 단답 허용 답은 한 줄에 하나
  - Meet 링크는 `https://meet.google.com/`으로 시작해야 저장

---

## 7. 디자인 시스템

### 7.1 방향
- 언어 학습 사이트의 고유 요소인 **스페인어 역물음표 ¿ ?** 를 히어로 타이포의 핵심 장치로 쓴다. 대담함은 이 한 곳에만
- 나머지는 조용하고 규칙적으로. 학원 광고 톤, 과장 문구 금지
- 피해야 할 기본값: 크림 배경 + 테라코타, 검정 배경 + 형광 포인트, 모든 콘텐츠를 같은 둥근 카드와 같은 그림자로 자르기, 제목 위 대문자 라벨, 가운뎃점으로 이은 메타 문자열, 버튼 끝 화살표

### 7.2 토큰 (tailwind.config.ts)
| 이름 | 값 | 용도 |
|---|---|---|
| paper | #F6F7FB | 배경 |
| ink | #16213E | 본문, 제목 |
| muted | #5A6278 | 보조 텍스트 |
| line | #D9DDEA | 테두리 |
| azul | #2443B8 | 주 버튼, 링크, 스페인어 과목 |
| azul-deep | #17307F | 버튼 hover |
| azul-soft | #E3E8FA | 선택 상태, 공지 배너 |
| azafran | #E9A800 | ¿ ? 장치, 한국어 과목, 포커스 링 |
| azafran-soft | #FCF1CF | 오늘 날짜, 경고성 안내 |
| ok | #1F7A4D | 정답, 승인 |
| warn | #A3480E | 오답, 오류, 삭제 |

- 반경: 6px 하나 (`rounded-tile`). 그림자 쓰지 않음. 테두리로 구분
- 폰트: Pretendard Variable 단일 패밀리. 제목은 800, 자간 -0.02em
- 본문 `word-break: keep-all`
- 포커스: 3px azafran outline
- `prefers-reduced-motion` 존중
- 최대 폭 72rem, 좌우 여백 20px(모바일) / 32px

### 7.3 히어로
```
¿오늘 몇 문장을 말했나요?        <- ¿ ? 만 azafran, 나머지 ink, clamp(2.3rem, 7.2vw, 5rem), 800
강의로 배우고, 문제로 확인하고, 15분 콜에서 직접 말합니다. ...   <- muted 17~18px, 최대 34rem
[수강신청]  [과목 보기]
```
- 영어: `¿How many sentences did you say today?`
- 좌측 정렬. 이미지 없음

### 7.4 주요 컴포넌트 규칙
- 과목 타일: 흰 배경, 테두리, 왼쪽 6px 색 띠(스페인어 azul, 한국어 azafran), 언어 라벨 → 과목명(22px 800) → 한 줄 소개. 전체가 링크
- 특징 블록: 카드 아님. 2열 정의 목록, 각 항목 위 1px 선, 질문은 18px bold, 답은 muted
- 단계 카드: 이름, 가격 또는 "준비 중", 포함(녹색 체크) / 미포함(회색 X) 목록
- 강사 블록: 위 3px ink 선, 좌측 제목 / 우측 본문
- 버튼 클래스: `.btn-primary`(azul), `.btn-quiet`(흰 배경 테두리), `.btn-ghost`(텍스트), disabled는 회색
- 입력 클래스: `.field`, 라벨 `.label`

### 7.5 반응형
- 390px에서 가로 스크롤 0. 표는 자체 `overflow-x: auto` 컨테이너
- 헤더 sticky, 반투명 paper 배경

---

## 8. 데이터 모델

전체 SQL은 **부록 A**. 요약:

| 테이블 | 핵심 컬럼 | 학생 권한 |
|---|---|---|
| profiles | id(auth uid), email, name, locale, role(admin/student), status(pending/approved/blocked) | 본인 select. 쓰기는 함수 |
| user_sessions | user_id PK, session_token, user_agent | 본인 select. 쓰기는 `claim_session()` |
| categories | slug, name_ko, name_en, sort | 공개 select |
| tiers | slug, rank, monthly_call_credits, live_access, price_krw | 공개 select, 관리자 update |
| entitlements | user_id, category, tier, starts_at, expires_at, source(admin/payment), granted_by, note | 본인 select. **쓰기 불가** |
| enrollment_requests | user_id, category, tier, message, status, handled_by | 본인 insert(pending만), select |
| courses / lessons | category, title, published / course_id, video_provider, video_id, materials_url, min_tier | 유효 권한 + 단계 충족 시 select |
| lesson_progress | user_id, lesson_id | 본인, 볼 수 있는 레슨만 insert |
| quizzes | category, kind(practice/mock), time_limit_min, max_attempts, min_tier, published | 권한 시 select |
| questions | type, prompt, choices, **answer**, **explanation**, points | **select 불가**. `quiz_questions()`로 정답 뺀 컬럼만 |
| attempts / attempt_answers | status(in_progress/submitted/needs_grading/graded), deadline_at, score | 본인 select. 쓰기는 함수 |
| call_bookings | cal_uid, starts_at, status(accepted/cancelled/over_limit), meet_url | 본인 select. 쓰기는 웹훅(service role) |
| credit_adjustments | user_id, category, month, delta | 본인 select, 관리자 쓰기 |
| live_sessions | category, title, starts_at, duration_min, **meet_url**, min_tier | 권한 시 select, **meet_url 컬럼 제외**. 링크는 `live_link()` |
| board_posts | category(null=공지), kind(notice/question), is_private | `can_read_post()` |
| board_comments | post_id, body, is_instructor | 트리거가 is_instructor 결정 |
| results / reviews | 스페이서. published | published만 공개 |

### 8.1 DB 함수
| 함수 | 역할 | 호출자 |
|---|---|---|
| `is_admin()` | 승인된 관리자 여부 | RLS |
| `has_access(cat, min_tier)` | 승인 상태 + 유효 기간 + 단계 충족 | RLS |
| `grant_access(user, cat, tier, starts, expires, source, note)` | **권한 생성 단일 경로**. pending 프로필은 approved로 | 관리자, service role(결제) |
| `admin_update_entitlement`, `admin_revoke_entitlement` | 단계·만료 변경, 회수(만료를 지금으로) | 관리자 |
| `approve_request`, `reject_request` | 수강신청 처리. 승인은 내부에서 `grant_access` | 관리자 |
| `admin_set_profile` | 상태·역할 변경. 자기 강등 금지 | 관리자 |
| `update_my_profile` | 이름, 언어 | 본인 |
| `claim_session(token, ua)` | 세션 토큰 upsert | 본인 |
| `start_attempt(quiz)` | 응시 시작. 진행 중이면 그것 반환. 횟수 초과면 예외 | 권한자 |
| `quiz_questions(quiz)` | 정답·해설 없는 문항 | 권한자 |
| `submit_attempt(attempt, responses)` | 채점. 마감+2분 지나면 응답 무시(0점) | 본인 |
| `attempt_result(attempt)` | 제출 후에만 정답·해설 포함 결과 | 본인, 관리자 |
| `grade_essay`, `admin_quiz_questions` | 서술형 채점, 관리자용 전체 문항 | 관리자 |
| `call_credits_for(user, cat, at)` | 크레딧 계산 (학생 직접 호출 불가) | 웹훅 |
| `my_call_credits(cat)` | 본인 이번 달 남은 횟수 | 본인 |
| `live_link(session)` | 시작 30분 전 ~ 종료까지만 Meet 링크 | 권한자 |

---

## 9. 권한과 보안 규칙

1. **권한 생성은 `grant_access()`만.** 클라이언트에서 entitlements 직접 쓰기 불가
2. 콘텐츠 select는 `유효 권한 AND tier >= min_tier AND now() in [starts_at, expires_at) AND profile approved`
3. 정답·해설은 제출 후 `attempt_result()`로만
4. service role 키는 `lib/supabase/admin.ts`(`import "server-only"`)에서만. 클라이언트 번들에 있으면 실패
5. 외부 URL은 렌더 전 `https://` 검사 (자료 링크, Meet 링크, 예약 링크)
6. 영상 ID는 `^[A-Za-z0-9_-]{1,64}$`만 임베드
7. UUID 경로 파라미터는 형식 검사 후 조회
8. 보안 헤더: X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy strict-origin-when-cross-origin, poweredByHeader false

### 9.1 1계정 1세션
- `/auth/callback`에서 코드 교환 성공 후 `randomUUID()` 토큰 발급 → `claim_session` RPC → httpOnly 쿠키 `vita_sid`(30일, sameSite lax, 운영에서 secure)
- `middleware.ts`: next-intl 미들웨어 실행 → Supabase 세션 갱신 → 보호 경로(`/myclass`, `/admin`, `/apply`, `/en/...` 포함)에서 쿠키 토큰과 `user_sessions.session_token` 비교 → 다르거나 없으면 `signOut({ scope: "local" })`, 쿠키 삭제, `/login?reason=other_device`로
- 미들웨어 matcher: `/((?!api|auth|_next|_vercel|.*\\..*).*)`
- 로그아웃: `POST /auth/signout` → 303으로 홈

### 9.2 영상 공유 억제
- 플레이어 위 로그인 이메일 반투명 워터마크, 20초마다 6개 위치 순환
- YouTube는 `youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1`

---

## 10. 기능 상세

### 10.1 문제 채점 규칙
- `choices`: 문자열 배열
- `mcq_single`: answer = 정답 인덱스(숫자). 응답과 jsonb 동등 비교
- `mcq_multi`: answer = 인덱스 배열. 정렬 후 비교 (순서 무관)
- `short_text`: answer = 허용 답 배열. `lower(trim(공백 하나로 압축))` 정규화 후 하나라도 일치하면 정답
- `essay`: 자동 채점 없음. 응시 상태 `needs_grading`, 관리자 채점 후 모두 끝나면 `graded`
- 모의고사: `deadline_at = started_at + time_limit`. 클라이언트 타이머가 0이 되면 자동 제출. 서버는 마감 + 2분까지 응답 인정, 이후 제출은 응답 무시
- 클라이언트 타이머는 서버 시각과의 차이를 보정

### 10.2 회화 콜 크레딧
```
이번 달 남은 횟수 = 유효 권한 단계의 monthly_call_credits 최대값
                  + 이번 달 credit_adjustments 합
                  - 이번 달 accepted 예약 수
(월 기준: Asia/Seoul)
```
- 0 이하면 예약 버튼 대신 안내문

### 10.3 Cal.com 연동
- 과목별 15분 이벤트를 만들고 링크를 환경변수에 둔다
- 예약 링크에 쿼리 추가: `email`, `name`, `metadata[user_id]`, `metadata[category]`
- 웹훅 `POST /api/cal/webhook`
  - 헤더 `x-cal-signature-256` = 원문 body의 HMAC-SHA256 hex (시크릿 `CAL_WEBHOOK_SECRET`). `timingSafeEqual` 비교. 틀리면 401
  - 시크릿 미설정이면 503
  - `BOOKING_CREATED`, `BOOKING_RESCHEDULED`: upsert(`cal_uid` 충돌 기준). 사용자 식별은 `metadata.user_id`(UUID 검사) → 없으면 참석자 이메일로 profiles 조회. 과목은 `metadata.category`(슬러그 검사)
  - 재예약: `rescheduleUid` 또는 `fromReschedule`의 이전 예약을 cancelled로
  - 신규 예약이 크레딧 0 이하에서 들어오면 `over_limit` (Cal.com에서 막을 수 없으므로 관리자가 확인). 같은 uid 재전송은 기존 상태 유지
  - `BOOKING_CANCELLED`: status cancelled → 크레딧 복구
  - Meet 링크: `payload.videoCallData.url` 또는 `payload.metadata.videoCallUrl`
- Cal.com 실제 payload 필드명은 연결 후 테스트 웹훅으로 확인하고 다르면 맞출 것

### 10.4 라이브
- 학생 목록은 RLS로 권한 + min_tier 충족 라이브만
- 링크는 `live_link()`: 시작 30분 전부터 종료 시각까지만

### 10.5 결제 스페이서
- `lib/payments/index.ts`: `PaymentProvider` 인터페이스(`createCheckout`, `verifyWebhook`), `PAYMENTS_ENABLED = false`
- `lib/payments/toss.ts`: 빈 구현 (`createCheckout`은 예외, `verifyWebhook`은 null)
- `POST /api/payments/webhook`: 항상 501 `{ error: "payments_not_enabled" }`
- 정식 런칭 시 할 일은 하나: 검증된 결제 이벤트에서 service role로 `grant_access(..., p_source => 'payment')`

### 10.6 합격자·후기 스페이서
- `NEXT_PUBLIC_SHOW_RESULTS`, `NEXT_PUBLIC_SHOW_REVIEWS` 기본 false
- false: 홈 섹션 미렌더, 메뉴·푸터 링크 숨김, `/reviews` 404
- true + 빈 데이터: "등록된 ... 이 아직 없습니다"로 깨지지 않게
- 관리자 입력 화면은 플래그와 무관하게 항상 동작
- 합격자 필드: 과목(선택), 가린 이름(예: 김**), 성과(예: TOPIK 6급), 연도, 설명, 공개

### 10.7 시간대
- DB 저장 timestamptz. 서버 렌더 기본 Asia/Seoul
- 학생 화면 시간은 `LocalTime` 클라이언트 컴포넌트가 브라우저 로컬로 다시 그림 (세종학당 수강생이 해외에 있을 수 있음)
- 관리자 입력은 서울 시간

---

## 11. 환경변수

```
# 공개
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_SHOW_RESULTS=false
NEXT_PUBLIC_SHOW_REVIEWS=false

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cal.com (과목별 15분 이벤트 링크, 웹훅 시크릿)
NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION=
NEXT_PUBLIC_CAL_LINK_ES_SCHOOL=
NEXT_PUBLIC_CAL_LINK_KO_CONVERSATION=
NEXT_PUBLIC_CAL_LINK_TOPIK=
CAL_WEBHOOK_SECRET=
```
- Supabase 값이 없으면 앱은 로그아웃 상태로 동작해야 한다 (공개 페이지 테스트 가능)

---

## 12. Phase 계획

각 Phase 끝: 수용 테스트 결과표, 스크린샷(필요 시), git commit `[VITA-Pn] 요약`, PROGRESS.md 갱신.

| Phase | 내용 | 사람 선행 작업 |
|---|---|---|
| P1 | 스캐폴드, 디자인 시스템, 공개 페이지, 다국어, 스페이서, 결제 501 | 없음 |
| P2 | DB 마이그레이션(부록 A), 시드, DB 수용 테스트(부록 C) 로컬 실행 | 로컬 Postgres 또는 Docker (12.1) |
| P3 | Supabase 연결, 로그인(Google, 매직링크), 콜백, 1계정 1세션 미들웨어, 관리자 회원·권한 화면 | Supabase 프로젝트, Google OAuth (14장) |
| P4 | 수강신청 연결, My Class 내 과목, 레슨·워터마크·진도, 관리자 강의 편집·수강신청 처리 | |
| P5 | 문제·모의고사 응시·결과, 관리자 문항 편집·채점 | |
| P6 | 회화콜(Cal.com 링크, 웹훅, 크레딧), 라이브, 캘린더, 관리자 라이브·콜 | Cal.com (14장) |
| P7 | 공지·Q&A, 관리자 게시판, 합격자·후기 입력, 단계 설정 | |
| P8 | 전체 점검: 13장 전체 재실행 (읽기 전용, 문제 목록만) | |
| P9 | 적대적 보안 리뷰 서브에이전트: 권한 우회, 정답 노출, 세션 우회, 웹훅 위조, 키 노출 관점 (읽기 전용, 목록만) | |
| P10 | P8·P9 문제 수정, Vercel 배포, 배포 URL 스모크 테스트, 학생 초대 가이드(한/영 1쪽) | GitHub, Vercel (14장) |

### 12.1 DB 테스트 환경 (P2)
- 1순위: Docker Desktop이 있으면 Supabase CLI `supabase start` 후 마이그레이션 적용, 부록 C를 auth 스텁 없이 Supabase 로컬 auth로 실행하도록 조정
- 2순위: Docker가 없으면 PostgreSQL 16 설치(Windows `winget install PostgreSQL.PostgreSQL.16` 또는 WSL) 후 부록 C 그대로 실행 (`bash supabase/tests/run.sh`, Windows는 Git Bash 또는 WSL)
- 마지막 수단: 실제 Supabase 프로젝트의 SQL Editor에 마이그레이션·시드 적용 후, 수용 테스트는 P3 이후 앱 E2E로 대체하고 로그에 명시

---

## 13. 수용 테스트

### 13.1 P1 공개 페이지 (Playwright, Supabase 미연결 상태)
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | `/` | 200, `data-section` 순서가 6.1과 일치 (6, 7 제외) |
| 2 | `/en` | 메뉴 영어, 히어로 영어 |
| 3 | 과목 4개 + `/courses/unknown` | 4개 200, unknown 404 |
| 4 | `/pricing` | 결제 버튼 3개 모두 disabled, 가격 "준비 중" 3개 |
| 5 | 플래그 false | ResultsSection·ReviewsSection DOM 없음, 메뉴·푸터에 후기 없음, `/reviews` 404 |
| 6 | 플래그 true (재빌드) | 두 섹션 빈 상태 문구로 렌더, 콘솔 오류 없음 |
| 7 | 푸터 | "사업자", "통신판매", "주소", 사업자번호 패턴 0건 |
| 8 | `POST /api/payments/webhook` | 501 |
| 9 | 390px 홈·과목·요금제·수강신청·로그인 | `document.documentElement.scrollWidth <= 390` |
| 10 | 저장소 전체 U+2014 | 0건 (node_modules 제외) |
| 11 | build, lint, tsc | 오류 0 |
| 12 | `/apply` 비로그인 | 폼 비활성, "로그인 후 신청" 링크가 `/login?next=/apply` |
| 13 | `/myclass` 비로그인 | `/login?next=...`로 이동 |
| 14 | 키보드 | Tab으로 헤더 메뉴, 드롭다운(Enter, Esc) 조작 가능, 포커스 링 보임 |

스크린샷: 홈, 과목 1개, 요금제를 390px·1280px로 `logs/build/screens/`.

### 13.2 P2 DB (부록 C)
- 60개 항목 전부 PASS. 항목 목록은 부록 C 본문 참조 (10.2~10.6 + 보안)

### 13.3 P3 로그인·세션 (실제 Supabase)
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | 신규 이메일 로그인 | profiles 행 생성, status pending, `/myclass`에 "승인 대기" |
| 2 | 같은 계정 브라우저 2개 | 두 번째 로그인 후 첫 브라우저 다음 이동에서 `/login?reason=other_device` + 안내 |
| 3 | 학생 `/admin` | 403 |
| 4 | 관리자 지정 SQL 후 `/admin` | 진입 |
| 5 | 관리자: 학생 승인 + es-conversation basic 부여 | 학생 My Class에 해당 과목만 |
| 6 | 클라이언트 번들 grep | service role 키 0건 |
| 7 | `/login?next=//evil.com` | 로그인 후 내부 기본 경로로 |

### 13.4 P4 강의·수강신청
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | 수강신청 제출 | pending, 관리자 목록 표시 |
| 2 | 승인 | `grant_access` 경유(entitlements.note = 'enrollment request'), My Class 즉시 반영 |
| 3 | 레슨 | 워터마크에 학생 이메일 |
| 4 | 완료 토글 | 새로고침 후 유지 |
| 5 | 관리자 강의·레슨 CRUD | 생성, 수정, 비공개 전환이 학생 화면에 반영 |
| 6 | min_tier=standard 레슨, basic 학생 | 목록 미노출, 직접 URL 404 |
| 7 | 만료일 지난 권한 | My Class에서 사라짐, 레슨 404 |

### 13.5 P5 문제
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | 객관식 단일·복수 | 자동 채점 정확, 복수는 순서 무관 |
| 2 | 단답 ` HOLA ` vs 허용 답 `hola` | 정답 |
| 3 | 서술형 | 채점 대기 → 관리자 채점 → 점수 반영, graded |
| 4 | 1분 모의고사 방치 | 0초에 자동 제출, 안내 표시 |
| 5 | 응시 횟수 1회 소진 | 시작 버튼 없음, RPC 직접 호출도 예외 |
| 6 | 응시 중 네트워크 응답 | answer, explanation 필드 없음 |

### 13.6 P6 콜·라이브
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | basic 학생 | 회화콜 카드에 0회 안내, 라이브 목록 없음 |
| 2 | standard 학생 | 2회, 예약 버튼 링크에 metadata 쿼리 포함 |
| 3 | 서명 맞는 BOOKING_CREATED | 기록, 남은 횟수 1 |
| 4 | 같은 uid 재전송 | 상태 accepted 유지, 중복 행 없음 |
| 5 | BOOKING_CANCELLED | 남은 횟수 2 |
| 6 | 서명 틀림 | 401, 기록 없음 |
| 7 | 크레딧 0에서 예약 | over_limit, 관리자 현황 카운트 증가 |
| 8 | 라이브 3시간 전 / 20분 전 | 링크 숨김 / `입장하기` 노출 |
| 9 | 캘린더 | 콜·라이브 점 표시, 브라우저 시간대 바꾸면 날짜·시간 따라 바뀜 |

### 13.7 P7 게시판
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | 비로그인 공지 | 열람 가능, 홈 배너에 최신 공지 |
| 2 | 권한 없는 과목 Q&A | 탭 없음, 직접 URL "권한 없음", REST 0행 |
| 3 | 비공개 질문 | 작성자·관리자 외 0행 |
| 4 | 관리자 댓글 | `강사 답변` 배지, 목록 `답변 완료` |
| 5 | 학생이 is_instructor=true로 댓글 insert | 트리거가 false로 |
| 6 | 합격자 입력 후 플래그 true 재빌드 | 홈에 공개 항목만 표시 |

### 13.8 P10 배포
| # | 테스트 | 정답 조건 |
|---|---|---|
| 1 | P8·P9 문제 | 전부 처리 또는 PROGRESS 알려진 문제로 기록 |
| 2 | 배포 URL 스모크 | 홈, 로그인, 승인, 레슨, 퀴즈 제출 |
| 3 | 배포 도메인 Google 로그인 | 성공 |
| 4 | 학생 초대 가이드 | 1쪽, 한국어·영어 (가입 → 수강신청 → 승인 후 My Class, 한 기기 정책 안내) |

---

## 14. 사람이 할 일 (Claude Code가 이 순서로 안내)

### 14.1 Supabase (P3 전)
1. supabase.com 가입 → New project (리전: Northeast Asia (Seoul) 권장)
2. Project Settings > API에서 URL, anon key, service_role key 복사 → `.env.local`
3. SQL Editor에서 `0001_init.sql` 실행 → `seed.sql` 실행
4. Authentication > URL Configuration
   - Site URL: `http://localhost:3000` (배포 후 운영 URL로 변경)
   - Redirect URLs: `http://localhost:3000/auth/callback`, 배포 후 `https://<도메인>/auth/callback`
5. Authentication > Providers > Email: 활성 (매직링크)
6. Google 로그인
   - Google Cloud Console > API 및 서비스 > OAuth 동의 화면 설정 (외부, 테스트 사용자 추가 또는 게시)
   - 사용자 인증 정보 > OAuth 클라이언트 ID (웹) 생성
   - 승인된 리디렉션 URI: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`
   - Client ID, Secret을 Supabase > Providers > Google에 입력
7. 본인 계정으로 사이트에서 한 번 로그인한 뒤 SQL Editor에서:
   ```sql
   update public.profiles set role = 'admin', status = 'approved' where email = '본인이메일';
   ```

### 14.2 Cal.com (P6 전)
1. Cal.com 가입, Google Calendar 연결, 기본 회의 앱을 Google Meet으로
2. 과목별 15분 이벤트 4개 생성 → 각 링크를 `NEXT_PUBLIC_CAL_LINK_*`에
3. Settings > Developer > Webhooks: URL `https://<도메인>/api/cal/webhook`, 이벤트 Booking Created / Cancelled / Rescheduled, 시크릿 설정 → `CAL_WEBHOOK_SECRET`
4. 로컬 테스트는 서명 맞춘 가짜 요청으로 (Claude Code가 스크립트 작성)

### 14.3 배포 (P10 전)
1. GitHub 저장소 (private)
2. Vercel 가입 → 저장소 import → 환경변수 11장 입력 → 배포
3. Supabase Site URL·Redirect URLs, Google OAuth, Cal.com 웹훅 URL을 운영 도메인으로 갱신

### 14.4 학생 초대 전
- 이용약관, 개인정보처리방침 실제 문구 (미성년 학생 포함이므로 개인정보 항목 명시)
- 강의 1개 이상, 레슨 몇 개, 문제 세트 1개 등록
- 세종학당 수강생 대상 사용은 학당 강사 규정 확인

---

## 15. 알려진 문제와 제약

| # | 내용 | 처리 시점 |
|---|---|---|
| 1 | YouTube 미등록 영상은 링크가 새면 외부에서 볼 수 있음 | 유료 런칭 전 Vimeo 도메인 제한 또는 보안 스트리밍 |
| 2 | 워터마크는 iframe 전체화면에서 사라짐 | 보안 스트리밍 전환 시 플레이어 자체 워터마크 |
| 3 | 화면 녹화, 한 화면 같이 보기는 막을 수 없음 | 워터마크로 억제만 |
| 4 | Vercel 무료 플랜은 상업적 사용 불가 | 유료 런칭 시 Pro |
| 5 | Supabase 무료 플랜은 1주 미사용 시 일시정지 | 공백기 주의, 유료 런칭 시 Pro |
| 6 | 매직링크는 요청한 브라우저에서 열어야 함 | 로그인 화면 안내 |
| 7 | 크레딧 초과 예약을 Cal.com 단에서 막을 수 없음 | over_limit 표시 후 관리자 처리 |
| 8 | 약관·개인정보처리방침 없음 | 학생 초대 전 |
| 9 | 유료 런칭 시 사업자등록, 통신판매업 신고, PG 계약, 사업자 푸터 필요 | 런칭 시 |
| 10 | 미성년 대상 유료 1:1 수업은 교육청 개인과외교습자 신고 대상일 수 있음 | 유료 전환 전 확인 |

---

## 16. 카피 원칙
- 사용자 관점 이름: "웹훅" 같은 시스템 용어를 학생 화면에 쓰지 않음
- 버튼은 결과를 말한다: `수강신청 보내기`, `질문 올리기`, `15분 콜 예약하기`
- 오류는 무엇이 잘못됐고 어떻게 하면 되는지
- 빈 화면은 다음 행동 안내
- 메타 정보는 쉼표로 연결 (가운뎃점 금지)
- 전체 문구는 부록 D

---
## 부록 A. DB 마이그레이션 (검증됨)

Supabase SQL Editor 또는 `supabase/migrations/`에 그대로 사용. 부록 C 60/60 통과.

### 0001_init.sql
`supabase/migrations/0001_init.sql`

```sql
-- Vita Language 초기 스키마
-- 원칙: 권한 생성은 grant_access 하나로만. 정답·해설과 Meet 링크는 학생이 직접 select 불가.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 기본 테이블
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  locale text not null default 'ko' check (locale in ('ko','en')),
  role text not null default 'student' check (role in ('admin','student')),
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now()
);

create table public.user_sessions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  session_token uuid not null,
  user_agent text,
  updated_at timestamptz not null default now()
);

create table public.categories (
  slug text primary key,
  name_ko text not null,
  name_en text not null,
  sort int not null default 0
);

create table public.tiers (
  slug text primary key check (slug in ('basic','standard','premium')),
  rank int not null unique,
  name_ko text not null,
  name_en text not null,
  monthly_call_credits int not null default 0 check (monthly_call_credits >= 0),
  live_access boolean not null default false,
  price_krw int
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  tier text not null references public.tiers(slug),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null check (source in ('admin','payment')),
  granted_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index on public.entitlements (user_id, category);

create table public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  tier text not null references public.tiers(slug),
  message text check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  description text,
  sort int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_provider text not null default 'youtube' check (video_provider in ('youtube','vimeo')),
  video_id text,
  materials_url text,
  min_tier text not null default 'basic' references public.tiers(slug),
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  kind text not null default 'practice' check (kind in ('practice','mock')),
  time_limit_min int check (time_limit_min is null or time_limit_min > 0),
  max_attempts int check (max_attempts is null or max_attempts > 0),
  min_tier text not null default 'basic' references public.tiers(slug),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type text not null check (type in ('mcq_single','mcq_multi','short_text','essay')),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  answer jsonb not null default 'null'::jsonb,
  explanation text,
  points int not null default 1 check (points >= 0),
  sort int not null default 0
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','needs_grading','graded'))
);

create table public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric,
  graded_by uuid references public.profiles(id),
  primary key (attempt_id, question_id)
);

create table public.call_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text references public.categories(slug),
  cal_uid text not null unique,
  attendee_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'accepted' check (status in ('accepted','cancelled','over_limit')),
  meet_url text,
  updated_at timestamptz not null default now()
);

create table public.credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null references public.categories(slug),
  month date not null,
  delta int not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.categories(slug),
  title text not null,
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min > 0),
  meet_url text,
  min_tier text not null default 'standard' references public.tiers(slug),
  created_at timestamptz not null default now()
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  kind text not null check (kind in ('notice','question')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 10000),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'notice' and category is null) or (kind = 'question' and category is not null))
);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

-- 스페이서: 합격자·후기 (화면은 플래그로 숨김)
create table public.results (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  masked_name text not null,
  headline text not null,
  detail text,
  year int,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  category text references public.categories(slug),
  masked_name text not null,
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 헬퍼 함수
-- ---------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.tier_rank(t text) returns int
language sql stable security definer set search_path = public as $$
  select rank from tiers where slug = t;
$$;

create or replace function public.has_access(cat text, min_tier text default 'basic') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from entitlements e
    join profiles p on p.id = e.user_id
    where e.user_id = auth.uid()
      and p.status = 'approved'
      and e.category = cat
      and now() >= e.starts_at and now() < e.expires_at
      and tier_rank(e.tier) >= tier_rank(min_tier)
  );
$$;

create or replace function public.lesson_visible(p_course uuid, p_min_tier text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courses c
    where c.id = p_course and c.published and has_access(c.category, p_min_tier)
  );
$$;

create or replace function public.can_read_post(p_post uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from board_posts b
    where b.id = p_post
      and (
        b.kind = 'notice'
        or is_admin()
        or (has_access(b.category) and (not b.is_private or b.author_id = auth.uid()))
      )
  );
$$;

-- ---------------------------------------------------------------
-- 가입 시 프로필 생성
-- ---------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- 1계정 1세션
-- ---------------------------------------------------------------
create or replace function public.claim_session(p_token uuid, p_user_agent text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into user_sessions (user_id, session_token, user_agent, updated_at)
  values (auth.uid(), p_token, left(p_user_agent, 300), now())
  on conflict (user_id) do update set session_token = excluded.session_token,
    user_agent = excluded.user_agent, updated_at = now();
end $$;

-- ---------------------------------------------------------------
-- 프로필
-- ---------------------------------------------------------------
create or replace function public.update_my_profile(p_name text, p_locale text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set name = left(p_name, 100), locale = case when p_locale in ('ko','en') then p_locale else locale end
  where id = auth.uid();
end $$;

create or replace function public.admin_set_profile(p_user uuid, p_status text, p_role text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() and (p_status <> 'approved' or coalesce(p_role,'admin') <> 'admin') then
    raise exception 'cannot demote self';
  end if;
  update profiles set status = p_status, role = coalesce(p_role, role) where id = p_user;
end $$;

-- ---------------------------------------------------------------
-- 권한 부여 단일 경로
-- ---------------------------------------------------------------
create or replace function public.grant_access(
  p_user uuid, p_category text, p_tier text, p_starts timestamptz, p_expires timestamptz,
  p_source text default 'admin', p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (is_admin() or auth.role() = 'service_role') then raise exception 'forbidden'; end if;
  if p_source = 'payment' and auth.role() <> 'service_role' then raise exception 'payment grants are server only'; end if;
  insert into entitlements (user_id, category, tier, starts_at, expires_at, source, granted_by, note)
  values (p_user, p_category, p_tier, coalesce(p_starts, now()), p_expires, p_source,
          case when auth.role() = 'service_role' then null else auth.uid() end, p_note)
  returning id into v_id;
  update profiles set status = 'approved' where id = p_user and status = 'pending';
  return v_id;
end $$;

create or replace function public.admin_update_entitlement(p_id uuid, p_tier text, p_expires timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update entitlements set tier = coalesce(p_tier, tier), expires_at = coalesce(p_expires, expires_at) where id = p_id;
end $$;

create or replace function public.admin_revoke_entitlement(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update entitlements set expires_at = greatest(now(), starts_at + interval '1 second') where id = p_id;
end $$;

-- ---------------------------------------------------------------
-- 수강신청
-- ---------------------------------------------------------------
create or replace function public.approve_request(p_request uuid, p_starts timestamptz, p_expires timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare r enrollment_requests; v_id uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into r from enrollment_requests where id = p_request and status = 'pending' for update;
  if not found then raise exception 'request not pending'; end if;
  v_id := grant_access(r.user_id, r.category, r.tier, p_starts, p_expires, 'admin', 'enrollment request');
  update enrollment_requests set status = 'approved', handled_by = auth.uid(), handled_at = now() where id = p_request;
  return v_id;
end $$;

create or replace function public.reject_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update enrollment_requests set status = 'rejected', handled_by = auth.uid(), handled_at = now()
  where id = p_request and status = 'pending';
end $$;

-- ---------------------------------------------------------------
-- 문제·모의고사
-- ---------------------------------------------------------------
create or replace function public.normalize_text(t text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.start_attempt(p_quiz uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q quizzes; v_count int; v_id uuid; v_open uuid;
begin
  select * into q from quizzes where id = p_quiz and published;
  if not found or not has_access(q.category, q.min_tier) then raise exception 'forbidden'; end if;
  select id into v_open from attempts
   where quiz_id = p_quiz and user_id = auth.uid() and status = 'in_progress'
     and (deadline_at is null or now() < deadline_at + interval '2 minutes')
   order by started_at desc limit 1;
  if v_open is not null then return v_open; end if;
  select count(*) into v_count from attempts where quiz_id = p_quiz and user_id = auth.uid();
  if q.max_attempts is not null and v_count >= q.max_attempts then raise exception 'max attempts reached'; end if;
  insert into attempts (quiz_id, user_id, deadline_at)
  values (p_quiz, auth.uid(), case when q.time_limit_min is null then null else now() + make_interval(mins => q.time_limit_min) end)
  returning id into v_id;
  return v_id;
end $$;

-- 학생용 문항 조회 (정답·해설 제외)
create or replace function public.quiz_questions(p_quiz uuid)
returns table (id uuid, type text, prompt text, choices jsonb, points int, sort int)
language plpgsql stable security definer set search_path = public as $$
declare q quizzes;
begin
  select * into q from quizzes where quizzes.id = p_quiz;
  if not found then raise exception 'not found'; end if;
  if not (is_admin() or (q.published and has_access(q.category, q.min_tier))) then raise exception 'forbidden'; end if;
  return query select qs.id, qs.type, qs.prompt, qs.choices, qs.points, qs.sort
    from questions qs where qs.quiz_id = p_quiz order by qs.sort, qs.id;
end $$;

-- 제출: p_responses = {"<question_id>": <response>, ...}
create or replace function public.submit_attempt(p_attempt uuid, p_responses jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a attempts; qs record; v_resp jsonb; v_correct boolean; v_pts numeric;
        v_score numeric := 0; v_max numeric := 0; v_essay boolean := false; v_late boolean;
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if a.status <> 'in_progress' then raise exception 'already submitted'; end if;
  v_late := a.deadline_at is not null and now() > a.deadline_at + interval '2 minutes';

  for qs in select * from questions where quiz_id = a.quiz_id loop
    v_resp := case when v_late then null else p_responses -> qs.id::text end;
    v_max := v_max + qs.points;
    v_correct := null; v_pts := null;
    if qs.type = 'mcq_single' then
      v_correct := v_resp is not null and v_resp = qs.answer;
    elsif qs.type = 'mcq_multi' then
      v_correct := v_resp is not null and jsonb_typeof(v_resp) = 'array'
        and (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(v_resp) x)
          = (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(qs.answer) x);
    elsif qs.type = 'short_text' then
      v_correct := v_resp is not null and exists (
        select 1 from jsonb_array_elements_text(qs.answer) ans
        where normalize_text(ans) = normalize_text(v_resp #>> '{}'));
    else
      v_essay := true;
    end if;
    if v_correct is not null then
      v_pts := case when v_correct then qs.points else 0 end;
      v_score := v_score + v_pts;
    end if;
    insert into attempt_answers (attempt_id, question_id, response, is_correct, points_awarded)
    values (p_attempt, qs.id, v_resp, v_correct, v_pts)
    on conflict (attempt_id, question_id) do update set response = excluded.response,
      is_correct = excluded.is_correct, points_awarded = excluded.points_awarded;
  end loop;

  update attempts set submitted_at = now(), score = v_score, max_score = v_max,
    status = case when v_essay then 'needs_grading' else 'graded' end
  where id = p_attempt;
end $$;

-- 결과 조회: 제출된 본인 응시(또는 관리자)만 정답·해설 포함
create or replace function public.attempt_result(p_attempt uuid)
returns table (question_id uuid, type text, prompt text, choices jsonb, points int, response jsonb,
               is_correct boolean, points_awarded numeric, answer jsonb, explanation text)
language plpgsql stable security definer set search_path = public as $$
declare a attempts;
begin
  select * into a from attempts where id = p_attempt;
  if not found or not (a.user_id = auth.uid() or is_admin()) then raise exception 'forbidden'; end if;
  if a.status = 'in_progress' then raise exception 'not submitted'; end if;
  return query
    select qs.id, qs.type, qs.prompt, qs.choices, qs.points, aa.response, aa.is_correct, aa.points_awarded,
           qs.answer, qs.explanation
    from questions qs
    left join attempt_answers aa on aa.question_id = qs.id and aa.attempt_id = p_attempt
    where qs.quiz_id = a.quiz_id order by qs.sort, qs.id;
end $$;

create or replace function public.grade_essay(p_attempt uuid, p_question uuid, p_points numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v_pending int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update attempt_answers set points_awarded = p_points, is_correct = p_points > 0, graded_by = auth.uid()
  where attempt_id = p_attempt and question_id = p_question;
  select count(*) into v_pending from attempt_answers aa join questions q on q.id = aa.question_id
   where aa.attempt_id = p_attempt and q.type = 'essay' and aa.graded_by is null;
  update attempts set score = (select coalesce(sum(points_awarded),0) from attempt_answers where attempt_id = p_attempt),
    status = case when v_pending = 0 then 'graded' else 'needs_grading' end
  where id = p_attempt;
end $$;

create or replace function public.admin_quiz_questions(p_quiz uuid) returns setof questions
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query select * from questions where quiz_id = p_quiz order by sort, id;
end $$;

-- ---------------------------------------------------------------
-- 회화 콜 크레딧
-- ---------------------------------------------------------------
create or replace function public.seoul_month(ts timestamptz) returns date
language sql immutable as $$ select date_trunc('month', ts at time zone 'Asia/Seoul')::date $$;

create or replace function public.call_credits_for(p_user uuid, p_category text, p_at timestamptz default now())
returns int language sql stable security definer set search_path = public as $$
  select greatest(0,
    coalesce((select max(t.monthly_call_credits) from entitlements e join tiers t on t.slug = e.tier
              where e.user_id = p_user and e.category = p_category and p_at >= e.starts_at and p_at < e.expires_at), 0)
    + coalesce((select sum(delta) from credit_adjustments
              where user_id = p_user and category = p_category and month = seoul_month(p_at)), 0)
    - (select count(*) from call_bookings
              where user_id = p_user and category = p_category and status = 'accepted'
                and seoul_month(starts_at) = seoul_month(p_at)))::int;
$$;

create or replace function public.my_call_credits(p_category text) returns int
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then 0 else call_credits_for(auth.uid(), p_category) end;
$$;

-- ---------------------------------------------------------------
-- 라이브 링크 (시작 30분 전부터, 종료 시각까지)
-- ---------------------------------------------------------------
create or replace function public.live_link(p_session uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare s live_sessions;
begin
  select * into s from live_sessions where id = p_session;
  if not found then return null; end if;
  if is_admin() then return s.meet_url; end if;
  if not has_access(s.category, s.min_tier) then return null; end if;
  if now() < s.starts_at - interval '30 minutes' or now() > s.starts_at + make_interval(mins => s.duration_min) then
    return null;
  end if;
  return s.meet_url;
end $$;

-- 게시판 댓글 강사 배지는 서버가 결정
create or replace function public.set_instructor_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.is_instructor := exists (select 1 from profiles where id = new.author_id and role = 'admin');
  return new;
end $$;
create trigger board_comment_flag before insert on public.board_comments
for each row execute function public.set_instructor_flag();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.tiers enable row level security;
alter table public.entitlements enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.call_bookings enable row level security;
alter table public.credit_adjustments enable row level security;
alter table public.live_sessions enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.results enable row level security;
alter table public.reviews enable row level security;

-- 기본 권한을 먼저 걷어내고 필요한 것만 연다
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- profiles: 본인 또는 관리자 조회, 쓰기는 함수로만
grant select on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (id = auth.uid() or is_admin());

-- user_sessions: 본인 조회, 쓰기는 claim_session
grant select on public.user_sessions to authenticated;
create policy sessions_read on public.user_sessions for select using (user_id = auth.uid());

-- categories, tiers: 공개 조회, tiers 수정은 관리자
grant select on public.categories, public.tiers to anon, authenticated;
create policy categories_read on public.categories for select using (true);
create policy tiers_read on public.tiers for select using (true);
grant update (monthly_call_credits, live_access, price_krw, name_ko, name_en) on public.tiers to authenticated;
create policy tiers_admin_update on public.tiers for update using (is_admin()) with check (is_admin());

-- entitlements: 조회만. 쓰기는 grant_access 등 함수
grant select on public.entitlements to authenticated;
create policy ent_read on public.entitlements for select using (user_id = auth.uid() or is_admin());

-- enrollment_requests
grant select, insert on public.enrollment_requests to authenticated;
create policy req_read on public.enrollment_requests for select using (user_id = auth.uid() or is_admin());
create policy req_insert on public.enrollment_requests for insert
  with check (user_id = auth.uid() and status = 'pending' and handled_by is null and handled_at is null);

-- courses, lessons
grant select, insert, update, delete on public.courses, public.lessons to authenticated;
create policy courses_read on public.courses for select using (is_admin() or (published and has_access(category)));
create policy courses_admin on public.courses for all using (is_admin()) with check (is_admin());
create policy lessons_read on public.lessons for select using (is_admin() or (published and lesson_visible(course_id, min_tier)));
create policy lessons_admin on public.lessons for all using (is_admin()) with check (is_admin());

-- lesson_progress
grant select, insert, delete on public.lesson_progress to authenticated;
create policy progress_own on public.lesson_progress for select using (user_id = auth.uid() or is_admin());
create policy progress_ins on public.lesson_progress for insert with check (
  user_id = auth.uid() and exists (select 1 from lessons l where l.id = lesson_id and l.published and lesson_visible(l.course_id, l.min_tier)));
create policy progress_del on public.lesson_progress for delete using (user_id = auth.uid());

-- quizzes
grant select, insert, update, delete on public.quizzes to authenticated;
create policy quizzes_read on public.quizzes for select using (is_admin() or (published and has_access(category, min_tier)));
create policy quizzes_admin on public.quizzes for all using (is_admin()) with check (is_admin());

-- questions: 직접 select 불가 (정답 보호). 학생은 quiz_questions(), 관리자는 admin_quiz_questions()
grant insert, update, delete on public.questions to authenticated;
create policy questions_admin_ins on public.questions for insert with check (is_admin());
create policy questions_admin_upd on public.questions for update using (is_admin()) with check (is_admin());
create policy questions_admin_del on public.questions for delete using (is_admin());

-- attempts, attempt_answers: 조회만
grant select on public.attempts, public.attempt_answers to authenticated;
create policy attempts_read on public.attempts for select using (user_id = auth.uid() or is_admin());
create policy answers_read on public.attempt_answers for select using (
  is_admin() or exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid() and a.status <> 'in_progress'));

-- call_bookings: 조회만 (쓰기는 웹훅 service role)
grant select on public.call_bookings to authenticated;
create policy bookings_read on public.call_bookings for select using (user_id = auth.uid() or is_admin());

-- credit_adjustments
grant select, insert, delete on public.credit_adjustments to authenticated;
create policy credits_read on public.credit_adjustments for select using (user_id = auth.uid() or is_admin());
create policy credits_admin_ins on public.credit_adjustments for insert with check (is_admin());
create policy credits_admin_del on public.credit_adjustments for delete using (is_admin());

-- live_sessions: meet_url 컬럼은 학생에게 비공개 (live_link 함수로만)
grant select (id, category, title, starts_at, duration_min, min_tier, created_at) on public.live_sessions to authenticated;
grant insert, update, delete on public.live_sessions to authenticated;
create policy live_read on public.live_sessions for select using (is_admin() or has_access(category, min_tier));
create policy live_admin_ins on public.live_sessions for insert with check (is_admin());
create policy live_admin_upd on public.live_sessions for update using (is_admin()) with check (is_admin());
create policy live_admin_del on public.live_sessions for delete using (is_admin());

-- board
grant select on public.board_posts, public.board_comments to anon;
grant select, insert, update, delete on public.board_posts, public.board_comments to authenticated;
create policy posts_read on public.board_posts for select using (can_read_post(id));
create policy posts_insert on public.board_posts for insert with check (
  author_id = auth.uid() and (
    (kind = 'notice' and is_admin())
    or (kind = 'question' and (is_admin() or has_access(category)))));
create policy posts_update on public.board_posts for update using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());
create policy posts_delete on public.board_posts for delete using (author_id = auth.uid() or is_admin());
create policy comments_read on public.board_comments for select using (can_read_post(post_id));
create policy comments_insert on public.board_comments for insert with check (
  author_id = auth.uid() and can_read_post(post_id)
  and exists (select 1 from board_posts b where b.id = post_id and (b.kind = 'question' or is_admin())));
create policy comments_delete on public.board_comments for delete using (author_id = auth.uid() or is_admin());

-- results, reviews (스페이서)
grant select on public.results, public.reviews to anon, authenticated;
grant insert, update, delete on public.results, public.reviews to authenticated;
create policy results_read on public.results for select using (published or is_admin());
create policy results_admin on public.results for all using (is_admin()) with check (is_admin());
create policy reviews_read on public.reviews for select using (published or is_admin());
create policy reviews_admin on public.reviews for all using (is_admin()) with check (is_admin());

-- 함수 실행 권한
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.can_read_post(uuid) to anon;
grant execute on function public.is_admin() to anon;
grant execute on function public.has_access(text, text) to anon;
grant execute on function public.tier_rank(text) to anon;
-- 웹훅 전용 (service role)
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
revoke execute on function public.call_credits_for(uuid, text, timestamptz) from authenticated;
```

## 부록 B. 시드

### seed.sql
`supabase/seed.sql`

```sql
-- 기본 데이터 (마이그레이션 후 1회)
insert into public.categories (slug, name_ko, name_en, sort) values
  ('es-conversation', '스페인어 회화', 'Spanish conversation', 1),
  ('es-school', '스페인어 내신', 'Spanish for school exams', 2),
  ('ko-conversation', '한국어 회화', 'Korean conversation', 3),
  ('topik', 'TOPIK', 'TOPIK', 4)
on conflict (slug) do nothing;

insert into public.tiers (slug, rank, name_ko, name_en, monthly_call_credits, live_access, price_krw) values
  ('basic', 1, '베이직', 'Basic', 0, false, null),
  ('standard', 2, '스탠다드', 'Standard', 2, true, null),
  ('premium', 3, '프리미엄', 'Premium', 4, true, null)
on conflict (slug) do nothing;

-- 관리자 지정: 본인 계정으로 한 번 로그인한 뒤 이메일을 바꿔 실행
-- update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
```

## 부록 C. DB 수용 테스트 (검증됨, 60/60 PASS)

로컬 Postgres에 Supabase auth를 흉내내는 스텁을 깔고 역할을 바꿔가며 RLS와 함수를 검증한다. `bash supabase/tests/run.sh` (postgres 사용자 권한 필요).

### auth 스텁
`supabase/tests/auth_stub.sql`

```sql
-- 로컬 Postgres에서 Supabase auth를 흉내내는 최소 스텁 (테스트 전용)
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'anon') $$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
```

### 실행 스크립트
`supabase/tests/run.sh`

```bash
#!/usr/bin/env bash
# 로컬 Postgres로 마이그레이션과 RLS 수용 테스트 실행
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=vita_test
PSQL="psql -X -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "drop database if exists $DB" >/dev/null
for r in anon authenticated service_role; do $PSQL -d postgres -c "drop role if exists $r" >/dev/null 2>&1 || true; done
$PSQL -d postgres -c "create database $DB" >/dev/null
$PSQL -d $DB -f supabase/tests/auth_stub.sql >/dev/null
$PSQL -d $DB -f supabase/migrations/0001_init.sql >/dev/null
$PSQL -d $DB -f supabase/seed.sql >/dev/null
$PSQL -d $DB -f supabase/tests/rls_test.sql
```

### 테스트 본문
`supabase/tests/rls_test.sql`

```sql
-- RLS·함수 수용 테스트. run.sh 가 새 DB에 stub + migration + seed 적용 후 실행
\set ON_ERROR_STOP on
create schema t;
create table t.results (id serial, code text, ok boolean, detail text);
grant usage on schema t to anon, authenticated, service_role;
grant insert, select on t.results to anon, authenticated, service_role;
grant usage on sequence t.results_id_seq to anon, authenticated, service_role;

create function t.check(p_code text, p_ok boolean, p_detail text default '') returns void
language sql as $$ insert into t.results (code, ok, detail) values (p_code, coalesce(p_ok, false), p_detail) $$;
create function t.expect_error(p_code text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform t.check(p_code, false, 'no error: ' || p_sql);
exception when others then
  perform t.check(p_code, true, sqlerrm);
end $$;
create function t.as(p_uid text, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, false);
end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

-- 사용자
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','admin@x.com'),
 ('00000000-0000-0000-0000-000000000001','s1@x.com'),
 ('00000000-0000-0000-0000-000000000002','s2@x.com'),
 ('00000000-0000-0000-0000-000000000003','s3@x.com');
update public.profiles set role='admin', status='approved' where email='admin@x.com';

-- 콘텐츠
insert into public.courses (id, category, title, published) values
 ('10000000-0000-0000-0000-000000000001','es-conversation','ES 회화 1',true),
 ('10000000-0000-0000-0000-000000000002','ko-conversation','KO 회화 1',true);
insert into public.lessons (id, course_id, title, video_id, min_tier) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','L1','abc','basic'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','L2','def','standard'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','L3','ghi','basic');
insert into public.quizzes (id, category, title, kind, time_limit_min, max_attempts, published) values
 ('30000000-0000-0000-0000-000000000001','es-conversation','연습',  'practice', null, null, true),
 ('30000000-0000-0000-0000-000000000002','es-conversation','모의고사','mock', 1, 1, true);
insert into public.questions (id, quiz_id, type, prompt, choices, answer, explanation, sort) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','mcq_single','1?','["a","b"]','1','해설1',1),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','mcq_multi','2?','["a","b","c"]','[0,2]','해설2',2),
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','short_text','3?','[]','["hola","buenas"]','해설3',3),
 ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','essay','4?','[]','null','해설4',4),
 ('40000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002','mcq_single','m?','["a","b"]','0','해설m',1);
insert into public.live_sessions (id, category, title, starts_at, meet_url) values
 ('50000000-0000-0000-0000-000000000001','es-conversation','곧',  now() + interval '10 minutes','https://meet.google.com/aaa'),
 ('50000000-0000-0000-0000-000000000002','es-conversation','나중',now() + interval '3 hours','https://meet.google.com/bbb');

-- ===== 10.2 =====
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.2-1 pending: 프로필 pending', (select status from public.profiles) = 'pending');
select t.check('10.2-1 pending: 레슨 0행', (select count(*) from public.lessons) = 0);
select t.expect_error('10.2-7 학생 entitlements insert 거부',
  $$insert into public.entitlements (user_id, category, tier, expires_at, source) values ('00000000-0000-0000-0000-000000000001','es-conversation','premium', now()+interval '1 year','admin')$$);
select t.expect_error('10.2-7 학생 grant_access 호출 거부',
  $$select public.grant_access('00000000-0000-0000-0000-000000000001','es-conversation','premium', now(), now()+interval '1 year')$$);
select t.expect_error('보안: 학생 profiles role 직접 수정 거부',
  $$update public.profiles set role='admin' where id = auth.uid()$$);
select t.expect_error('보안: 학생 admin_set_profile 거부',
  $$select public.admin_set_profile('00000000-0000-0000-0000-000000000001','approved','admin')$$);
select t.expect_error('보안: 학생 call_credits_for 직접 호출 거부',
  $$select public.call_credits_for('00000000-0000-0000-0000-000000000002','es-conversation')$$);
select public.claim_session('99999999-0000-0000-0000-000000000001'::uuid, 'ua1');
select t.check('10.2-5 세션 토큰 본인 조회', (select session_token from public.user_sessions) = '99999999-0000-0000-0000-000000000001');
select public.claim_session('99999999-0000-0000-0000-000000000002'::uuid, 'ua2');
select t.check('10.2-5 재로그인 시 토큰 교체', (select session_token from public.user_sessions) = '99999999-0000-0000-0000-000000000002');

select t.as('00000000-0000-0000-0000-00000000000a');
select public.grant_access('00000000-0000-0000-0000-000000000001','es-conversation','basic', now(), now() + interval '30 days');
select public.grant_access('00000000-0000-0000-0000-000000000002','es-conversation','basic', now() - interval '10 days', now() - interval '1 day');
select public.grant_access('00000000-0000-0000-0000-000000000003','es-conversation','basic', now(), now() + interval '30 days');
select t.check('세션: 다른 사람 세션 행 안 보임(관리자도)', (select count(*) from public.user_sessions) = 0);

select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.2-2 승인 후 status approved', (select status from public.profiles) = 'approved');
select t.check('10.2-2 es 레슨 basic만 1행', (select count(*) from public.lessons) = 1);
select t.check('10.2-3 ko 레슨 직접 조회 0행', (select count(*) from public.lessons where id = '20000000-0000-0000-0000-000000000003') = 0);
select t.check('10.3-6 standard 레슨 직접 조회 0행', (select count(*) from public.lessons where id = '20000000-0000-0000-0000-000000000002') = 0);
select t.check('profiles 본인만', (select count(*) from public.profiles) = 1);

select t.as('00000000-0000-0000-0000-000000000002');
select t.check('10.2-4 만료 권한 레슨 0행', (select count(*) from public.lessons) = 0);

-- ===== 10.3 수강신청 =====
select t.expect_error('10.3-1 승인 상태로 신청 insert 거부',
  $$insert into public.enrollment_requests (user_id, category, tier, status) values (auth.uid(),'es-conversation','premium','approved')$$);
select t.expect_error('10.3-1 타인 명의 신청 거부',
  $$insert into public.enrollment_requests (user_id, category, tier) values ('00000000-0000-0000-0000-000000000001','es-conversation','premium')$$);
insert into public.enrollment_requests (id, user_id, category, tier, message)
 values ('60000000-0000-0000-0000-000000000001', auth.uid(), 'es-conversation', 'standard', '연장 희망');
select t.check('10.3-1 신청 pending', (select status from public.enrollment_requests) = 'pending');
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('10.3-1 관리자 목록에 표시', (select count(*) from public.enrollment_requests where status='pending') = 1);
select public.approve_request('60000000-0000-0000-0000-000000000001', now(), now() + interval '30 days');
select t.as('00000000-0000-0000-0000-000000000002');
select t.check('10.3-2 승인 후 레슨 2행(standard)', (select count(*) from public.lessons) = 2);
select t.check('10.3-2 grant_access 경유 note', (select count(*) from public.entitlements where note = 'enrollment request') = 1);

-- 진도
select t.as('00000000-0000-0000-0000-000000000001');
insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000001');
select t.check('10.3-4 진도 저장', (select count(*) from public.lesson_progress) = 1);
select t.expect_error('보안: 권한 밖 레슨 진도 insert 거부',
  $$insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '20000000-0000-0000-0000-000000000003')$$);

-- ===== 10.4 문제 =====
select t.expect_error('10.4-6 학생 questions 직접 select 거부', $$select answer from public.questions$$);
select t.check('10.4-6 quiz_questions 정답 컬럼 없음',
  not exists (select 1 from information_schema.routines r join information_schema.parameters p on p.specific_name = r.specific_name
              where r.routine_name = 'quiz_questions' and p.parameter_name in ('answer','explanation')));
select t.check('10.4 quiz_questions 4문항', (select count(*) from public.quiz_questions('30000000-0000-0000-0000-000000000001')) = 4);
select public.start_attempt('30000000-0000-0000-0000-000000000001');
select t.expect_error('10.4-6 제출 전 결과 조회 거부',
  $$select * from public.attempt_result((select id from public.attempts limit 1))$$);
select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'),
  '{"40000000-0000-0000-0000-000000000001":1,"40000000-0000-0000-0000-000000000002":[2,0],"40000000-0000-0000-0000-000000000003":"  HOLA ","40000000-0000-0000-0000-000000000004":"mi texto"}');
select t.check('10.4-1 객관식 단일 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000001'));
select t.check('10.4-1 객관식 복수 순서 무관 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000002'));
select t.check('10.4-2 단답 정규화 정답', (select is_correct from public.attempt_answers where question_id='40000000-0000-0000-0000-000000000003'));
select t.check('10.4-3 서술형 채점 대기', (select status from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001') = 'needs_grading');
select t.check('10.4 제출 후 결과에 해설 포함', (select count(*) from public.attempt_result((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001')) where explanation is not null) = 4);
select t.expect_error('보안: 재제출 거부',
  $$select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'), '{}')$$);
select t.as('00000000-0000-0000-0000-000000000003');
select t.expect_error('보안: 타인 응시 결과 조회 거부',
  $$select * from public.attempt_result((select id from public.attempts limit 1))$$);
select t.check('보안: 타인 응시 행 안 보임', (select count(*) from public.attempts) = 0);
select t.as('00000000-0000-0000-0000-00000000000a');
select public.grade_essay((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'), '40000000-0000-0000-0000-000000000004', 1);
select t.check('10.4-3 채점 후 graded, 4점', (select status = 'graded' and score = 4 from public.attempts where quiz_id='30000000-0000-0000-0000-000000000001'));

-- 모의고사: 시간 초과, 응시 횟수
select t.as('00000000-0000-0000-0000-000000000001');
select public.start_attempt('30000000-0000-0000-0000-000000000002');
reset role;
update public.attempts set deadline_at = now() - interval '10 minutes', started_at = now() - interval '11 minutes'
 where quiz_id = '30000000-0000-0000-0000-000000000002';
set role authenticated;
select public.submit_attempt((select id from public.attempts where quiz_id='30000000-0000-0000-0000-000000000002'),
  '{"40000000-0000-0000-0000-000000000005":0}');
select t.check('10.4-4 마감 후 늦은 제출은 0점', (select score from public.attempts where quiz_id='30000000-0000-0000-0000-000000000002') = 0);
select t.expect_error('10.4-5 응시 횟수 초과 거부', $$select public.start_attempt('30000000-0000-0000-0000-000000000002')$$);

-- ===== 10.5 라이브·콜 =====
select t.check('10.5-5 basic 학생 라이브 0행', (select count(*) from public.live_sessions) = 0);
select t.check('10.5-1 basic 크레딧 0', public.my_call_credits('es-conversation') = 0);
select t.as('00000000-0000-0000-0000-00000000000a');
select public.admin_update_entitlement((select id from public.entitlements where user_id='00000000-0000-0000-0000-000000000001'), 'standard', null);
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.5 standard 라이브 2행', (select count(*) from public.live_sessions) = 2);
select t.expect_error('10.5-6 meet_url 직접 select 거부', $$select meet_url from public.live_sessions$$);
select t.check('10.5-6 30분 이내 링크 노출', public.live_link('50000000-0000-0000-0000-000000000001') is not null);
select t.check('10.5-6 3시간 전 링크 숨김', public.live_link('50000000-0000-0000-0000-000000000002') is null);
select t.check('10.5 standard 크레딧 2', public.my_call_credits('es-conversation') = 2);
reset role;
set role service_role;
select t.as(null, 'service_role');
insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at)
 values ('00000000-0000-0000-0000-000000000001','es-conversation','cal-1', now() + interval '1 day', now() + interval '1 day 15 minutes');
set role authenticated;
select t.as('00000000-0000-0000-0000-000000000001');
select t.check('10.5-2 예약 후 크레딧 1', public.my_call_credits('es-conversation') = 1);
reset role; update public.call_bookings set status = 'cancelled' where cal_uid = 'cal-1'; set role authenticated;
select t.check('10.5-3 취소 후 크레딧 2', public.my_call_credits('es-conversation') = 2);
select t.expect_error('보안: 학생 call_bookings insert 거부',
  $$insert into public.call_bookings (user_id, category, cal_uid, starts_at, ends_at) values (auth.uid(),'es-conversation','x', now(), now())$$);

-- ===== 10.6 게시판 =====
select t.as('00000000-0000-0000-0000-00000000000a');
insert into public.board_posts (kind, author_id, title, body) values ('notice', auth.uid(), '공지', '내용');
select t.as('00000000-0000-0000-0000-000000000001');
select t.expect_error('10.6-2 권한 없는 과목 질문 작성 거부',
  $$insert into public.board_posts (kind, category, author_id, title, body) values ('question','ko-conversation', auth.uid(), 'q','b')$$);
select t.expect_error('보안: 학생 공지 작성 거부',
  $$insert into public.board_posts (kind, author_id, title, body) values ('notice', auth.uid(), 'x','y')$$);
insert into public.board_posts (id, kind, category, author_id, title, body, is_private)
 values ('70000000-0000-0000-0000-000000000001','question','es-conversation', auth.uid(), '비공개 질문','b', true);
insert into public.board_posts (id, kind, category, author_id, title, body)
 values ('70000000-0000-0000-0000-000000000002','question','es-conversation', auth.uid(), '공개 질문','b');
insert into public.board_comments (post_id, author_id, body, is_instructor)
 values ('70000000-0000-0000-0000-000000000002', auth.uid(), '학생 댓글', true);
select t.check('10.6-4 학생 댓글 강사 배지 위조 불가', (select not is_instructor from public.board_comments where body = '학생 댓글'));
select t.as('00000000-0000-0000-0000-000000000003');
select t.check('10.6-3 타 학생 비공개 질문 0행', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000001') = 0);
select t.check('10.6 같은 과목 공개 질문 보임', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000002') = 1);
select t.as('00000000-0000-0000-0000-00000000000a');
select t.check('10.6-3 관리자 비공개 질문 보임', (select count(*) from public.board_posts where id = '70000000-0000-0000-0000-000000000001') = 1);
insert into public.board_comments (post_id, author_id, body) values ('70000000-0000-0000-0000-000000000001', auth.uid(), '강사 답변');
select t.check('10.6-4 관리자 댓글 강사 배지', (select is_instructor from public.board_comments where body = '강사 답변'));
reset role;
set role anon;
select t.as(null, 'anon');
select t.check('10.6-1 비로그인 공지 열람', (select count(*) from public.board_posts where kind = 'notice') = 1);
select t.check('10.6-2 비로그인 질문 0행', (select count(*) from public.board_posts where kind = 'question') = 0);
select t.check('스페이서: 비공개 합격자 0행', (select count(*) from public.results) = 0);
select t.expect_error('보안: anon lessons 거부', $$select * from public.lessons$$);
reset role;

\echo
\echo ===== 결과 =====
select case when ok then 'PASS' else 'FAIL' end as r, code, left(detail, 70) as detail from t.results order by id;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail from t.results;
```

## 부록 D. UI 문구

### 한국어
`messages/ko.json`

```json
{
  "meta": { "title": "Vita Language", "description": "스페인어 회화·내신, 한국어 회화, TOPIK 온라인 클래스" },
  "nav": {
    "courses": "과목", "live": "라이브·회화콜", "pricing": "요금제", "reviews": "수강후기", "board": "공지·Q&A",
    "login": "로그인", "myclass": "My Class", "admin": "관리자", "apply": "수강신청", "logout": "로그아웃",
    "menu": "메뉴", "close": "닫기", "language": "English", "skip": "본문으로 건너뛰기"
  },
  "home": {
    "heroBefore": "¿",
    "heroQuestion": "오늘 몇 문장을 말했나요",
    "heroAfter": "?",
    "heroLead": "강의로 배우고, 문제로 확인하고, 15분 콜에서 직접 말합니다. 스페인어와 한국어를 말하는 시간 중심으로 공부하는 온라인 클래스입니다.",
    "ctaApply": "수강신청", "ctaCourses": "과목 보기",
    "coursesTitle": "과목", "coursesLead": "배우는 언어와 목적에 맞는 과목을 고르세요.",
    "featuresTitle": "수업은 이렇게 진행됩니다",
    "pricingTitle": "요금제", "pricingLead": "모든 단계에 강의, 문제, Q&A가 포함됩니다. 단계가 올라가면 라이브와 회화 콜이 더해집니다.",
    "pricingMore": "요금제 자세히 보기",
    "resultsTitle": "합격과 성과", "resultsEmpty": "등록된 성과가 아직 없습니다.",
    "reviewsTitle": "수강후기", "reviewsEmpty": "등록된 후기가 아직 없습니다.",
    "instructorTitle": "강사", "instructorBody": "강의 제작, 채점, 회화 콜, Q&A 답변을 같은 강사가 직접 맡습니다. 수업 중에 생긴 질문은 다음 콜에서 이어서 다룹니다.",
    "boardTitle": "궁금한 점이 있나요", "boardBody": "공지사항에서 일정과 변경 사항을 확인하고, 수강생은 과목별 Q&A에 질문을 남길 수 있습니다.",
    "boardCta": "공지·Q&A로 이동", "noticeLabel": "공지"
  },
  "features": [
    { "q": "강의는 언제든 다시 볼 수 있나요?", "a": "수강 기간 동안 과목별 영상 강의를 반복해서 볼 수 있습니다. 레슨마다 완료 표시로 진도를 관리합니다." },
    { "q": "실력 확인은 어떻게 하나요?", "a": "연습 문제와 시간 제한 모의고사를 풉니다. 객관식과 단답형은 바로 채점되고, 서술형은 강사가 채점합니다." },
    { "q": "직접 말할 기회가 있나요?", "a": "15분 1:1 회화 콜을 캘린더에서 예약합니다. 예약하면 Google Meet 링크가 자동으로 만들어집니다." },
    { "q": "라이브 수업도 있나요?", "a": "정해진 시간에 Google Meet로 진행합니다. 입장 링크는 시작 30분 전에 열립니다." },
    { "q": "모르는 건 어디에 묻나요?", "a": "과목별 Q&A 게시판에 남기면 강사가 직접 답합니다. 다른 수강생에게 보이지 않는 비공개 질문도 쓸 수 있습니다." },
    { "q": "일정은 어디서 보나요?", "a": "My Class 캘린더에서 예약한 콜과 라이브 일정을 한 화면에 모아 봅니다." }
  ],
  "course": {
    "audience": "이런 분께 맞습니다", "curriculum": "커리큘럼", "includes": "포함 기능",
    "seePricing": "요금제 보기", "apply": "이 과목 수강신청", "other": "다른 과목"
  },
  "pricing": {
    "title": "요금제", "lead": "지금은 테스트 운영 중이라 온라인 결제를 받지 않습니다. 수강신청을 남기면 강사가 확인 후 수강 권한을 열어 드립니다.",
    "perMonth": "월", "won": "원", "preparing": "준비 중",
    "lessons": "영상 강의와 진도 관리", "quizzes": "연습 문제와 모의고사", "qa": "과목별 Q&A",
    "live": "라이브 수업", "calls": "15분 회화 콜 월 {count}회", "noCalls": "회화 콜 없음", "noLive": "라이브 수업 없음",
    "payDisabled": "결제 준비 중", "useApply": "수강신청으로 이용하기", "note": "가격과 구성은 정식 오픈 때 확정됩니다."
  },
  "apply": {
    "title": "수강신청", "lead": "과목과 단계를 고르고 남길 말을 적어 주세요. 강사가 확인하면 My Class에서 바로 수강할 수 있습니다.",
    "category": "과목", "tier": "단계", "message": "남길 말 (선택)", "messagePlaceholder": "학년, 현재 수준, 원하는 일정 등을 적어 주세요.",
    "submit": "수강신청 보내기", "loginFirst": "로그인 후 신청할 수 있습니다", "sent": "수강신청을 보냈습니다. 승인되면 My Class에 과목이 나타납니다.",
    "error": "신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.", "myRequests": "내 신청 내역",
    "status_pending": "확인 중", "status_approved": "승인됨", "status_rejected": "반려됨"
  },
  "login": {
    "title": "로그인", "lead": "처음이라면 로그인과 동시에 가입됩니다. 가입 후 강사 승인이 끝나면 수강할 수 있습니다.",
    "google": "Google 계정으로 계속하기", "or": "또는", "email": "이메일", "emailSubmit": "로그인 링크 받기",
    "emailSent": "{email} 로 로그인 링크를 보냈습니다. 메일함에서 링크를 눌러 주세요.",
    "other_device": "다른 기기에서 로그인되어 이 기기는 로그아웃되었습니다. 한 계정은 한 기기에서만 사용할 수 있습니다.",
    "failed": "로그인에 실패했습니다. 다시 시도해 주세요.",
    "notConfigured": "로그인 서버가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.",
    "policy": "한 계정은 동시에 한 기기에서만 로그인됩니다. 새 기기에서 로그인하면 이전 기기는 자동으로 로그아웃됩니다."
  },
  "live": {
    "title": "라이브·회화콜", "lead": "라이브 수업은 정해진 시간에 Google Meet로 진행하고, 15분 회화 콜은 원하는 시간을 골라 1:1로 진행합니다.",
    "liveHow": "라이브 수업", "liveHowBody": "스탠다드 이상 수강생에게 일정이 공개됩니다. 입장 링크는 시작 30분 전에 열립니다.",
    "callHow": "15분 회화 콜", "callHowBody": "단계별로 매월 정해진 횟수만큼 예약할 수 있습니다. 예약과 일정 확인은 My Class에서 합니다.",
    "goMyclass": "My Class에서 예약하기", "empty": "예정된 라이브가 없습니다."
  },
  "board": {
    "title": "공지·Q&A", "notices": "공지사항", "qa": "Q&A", "emptyNotices": "등록된 공지가 없습니다.",
    "qaLocked": "Q&A는 수강생만 볼 수 있습니다. 로그인 후 수강 중인 과목의 게시판이 열립니다.",
    "emptyQa": "아직 질문이 없습니다. 첫 질문을 남겨 보세요.", "write": "질문하기", "titleLabel": "제목", "bodyLabel": "내용",
    "private": "비공개 질문 (나와 강사만 볼 수 있음)", "submit": "질문 올리기", "comment": "댓글", "commentSubmit": "댓글 달기",
    "instructor": "강사 답변", "privateBadge": "비공개", "back": "목록으로", "delete": "삭제", "answered": "답변 완료", "waiting": "답변 대기",
    "noAccess": "이 글을 볼 수 있는 권한이 없습니다."
  },
  "myclass": {
    "title": "My Class", "pendingTitle": "승인 대기 중", "pendingBody": "가입이 완료되었습니다. 강사가 확인하면 수강 중인 과목이 이곳에 나타납니다. 수강신청을 아직 하지 않았다면 먼저 신청해 주세요.",
    "blockedTitle": "이용이 중지된 계정입니다", "blockedBody": "자세한 내용은 강사에게 문의해 주세요.",
    "tabs": { "courses": "내 과목", "quizzes": "문제·모의고사", "schedule": "일정", "calls": "회화콜 예약", "questions": "내 질문" },
    "noCourses": "수강 중인 과목이 없습니다.", "expires": "{date}까지", "tier": "단계",
    "lessons": "레슨", "completed": "완료", "markDone": "완료로 표시", "markUndo": "완료 취소", "materials": "자료 내려받기",
    "noVideo": "영상이 아직 등록되지 않았습니다.", "progress": "{done}/{total} 완료",
    "quizPractice": "연습", "quizMock": "모의고사", "minutes": "{n}분", "attemptsLeft": "남은 응시 {n}회", "noQuizzes": "열린 문제가 없습니다.",
    "start": "시작하기", "continue": "이어서 풀기", "viewResult": "결과 보기", "noMoreAttempts": "응시 횟수를 모두 사용했습니다.",
    "creditsLeft": "이번 달 남은 회화 콜 {n}회", "noCredits": "이번 달 회화 콜을 모두 사용했거나 현재 단계에 회화 콜이 없습니다.",
    "book": "15분 콜 예약하기", "bookNotReady": "예약 링크가 아직 준비되지 않았습니다.", "upcoming": "다가오는 일정", "noUpcoming": "예정된 일정이 없습니다.",
    "call": "회화 콜", "liveClass": "라이브", "join": "입장하기", "linkSoon": "링크는 시작 30분 전에 열립니다",
    "today": "오늘", "prev": "이전 달", "next": "다음 달", "localTime": "시간은 이 기기 기준으로 표시됩니다.",
    "noQuestions": "남긴 질문이 없습니다.", "goBoard": "Q&A로 이동"
  },
  "quiz": {
    "timeLeft": "남은 시간", "submit": "제출하기", "submitting": "제출 중", "confirm": "제출하면 답을 바꿀 수 없습니다. 제출할까요?",
    "autoSubmitted": "시간이 끝나 자동 제출되었습니다.", "answerPlaceholder": "답을 입력하세요", "essayPlaceholder": "답안을 작성하세요",
    "resultTitle": "결과", "score": "점수", "pendingGrade": "서술형 채점 대기 중", "correct": "정답", "wrong": "오답", "yourAnswer": "내 답",
    "answer": "정답", "explanation": "해설", "noAnswer": "답하지 않음", "back": "문제 목록으로", "pick": "하나를 고르세요", "pickMany": "해당하는 것을 모두 고르세요",
    "error": "문제를 불러오지 못했습니다."
  },
  "footer": { "contact": "문의", "terms": "이용약관", "privacy": "개인정보처리방침", "rights": "All rights reserved." },
  "legal": { "draft": "초안 준비 중입니다. 정식 오픈 전에 게시됩니다." },
  "common": { "notFound": "페이지를 찾을 수 없습니다.", "home": "홈으로", "forbidden": "접근 권한이 없습니다.", "save": "저장", "cancel": "취소" }
}
```

### 영어
`messages/en.json`

```json
{
  "meta": { "title": "Vita Language", "description": "Online classes for Spanish conversation, Spanish school exams, Korean conversation and TOPIK" },
  "nav": {
    "courses": "Courses", "live": "Live and calls", "pricing": "Plans", "reviews": "Reviews", "board": "Notices and Q&A",
    "login": "Log in", "myclass": "My Class", "admin": "Admin", "apply": "Apply", "logout": "Log out",
    "menu": "Menu", "close": "Close", "language": "한국어", "skip": "Skip to content"
  },
  "home": {
    "heroBefore": "¿",
    "heroQuestion": "How many sentences did you say today",
    "heroAfter": "?",
    "heroLead": "Learn from lessons, check yourself with practice sets, and speak in 15-minute calls. Online classes in Spanish and Korean, built around time spent speaking.",
    "ctaApply": "Apply", "ctaCourses": "See courses",
    "coursesTitle": "Courses", "coursesLead": "Pick a course by the language you are learning and what you need it for.",
    "featuresTitle": "How classes work",
    "pricingTitle": "Plans", "pricingLead": "Every plan includes lessons, practice sets and Q&A. Higher plans add live classes and speaking calls.",
    "pricingMore": "See plan details",
    "resultsTitle": "Results", "resultsEmpty": "No results posted yet.",
    "reviewsTitle": "Reviews", "reviewsEmpty": "No reviews posted yet.",
    "instructorTitle": "Instructor", "instructorBody": "The same instructor makes the lessons, grades your answers, runs your calls and replies on the Q&A board. Questions from class carry over into your next call.",
    "boardTitle": "Questions?", "boardBody": "Check notices for schedules and changes. Enrolled students can post questions on their course Q&A board.",
    "boardCta": "Go to notices and Q&A", "noticeLabel": "Notice"
  },
  "features": [
    { "q": "Can I rewatch lessons?", "a": "Watch your course videos as often as you like while enrolled. Mark each lesson done to track progress." },
    { "q": "How do I check my level?", "a": "Practice sets and timed mock exams. Multiple choice and short answers are graded instantly. Written answers are graded by the instructor." },
    { "q": "Will I get to speak?", "a": "Book a 15-minute 1:1 speaking call from the calendar. A Google Meet link is created when you book." },
    { "q": "Are there live classes?", "a": "Yes, on Google Meet at scheduled times. The join link opens 30 minutes before the start." },
    { "q": "Where do I ask questions?", "a": "Post on your course Q&A board and the instructor replies. You can also post private questions only you and the instructor can see." },
    { "q": "Where is my schedule?", "a": "The My Class calendar shows your booked calls and live classes on one screen." }
  ],
  "course": {
    "audience": "Who it is for", "curriculum": "Curriculum", "includes": "What is included",
    "seePricing": "See plans", "apply": "Apply for this course", "other": "Other courses"
  },
  "pricing": {
    "title": "Plans", "lead": "We are in a test run and do not take online payments yet. Send an application and the instructor will open your access after checking it.",
    "perMonth": "month", "won": "KRW", "preparing": "Coming soon",
    "lessons": "Video lessons with progress tracking", "quizzes": "Practice sets and mock exams", "qa": "Course Q&A",
    "live": "Live classes", "calls": "{count} speaking calls per month", "noCalls": "No speaking calls", "noLive": "No live classes",
    "payDisabled": "Payments coming soon", "useApply": "Apply instead", "note": "Prices and plan contents will be set at the official launch."
  },
  "apply": {
    "title": "Apply", "lead": "Choose a course and plan, and add a note. Once the instructor approves, the course appears in My Class.",
    "category": "Course", "tier": "Plan", "message": "Note (optional)", "messagePlaceholder": "Your current level, school year, preferred schedule, and so on.",
    "submit": "Send application", "loginFirst": "Log in to apply", "sent": "Application sent. The course will appear in My Class once approved.",
    "error": "Could not send your application. Try again in a moment.", "myRequests": "My applications",
    "status_pending": "Under review", "status_approved": "Approved", "status_rejected": "Declined"
  },
  "login": {
    "title": "Log in", "lead": "New here? Logging in creates your account. You can start once the instructor approves it.",
    "google": "Continue with Google", "or": "or", "email": "Email", "emailSubmit": "Email me a login link",
    "emailSent": "We sent a login link to {email}. Open it from your inbox.",
    "other_device": "You logged in on another device, so this device was logged out. Each account works on one device at a time.",
    "failed": "Login failed. Try again.",
    "notConfigured": "The login server is not connected yet. Contact the administrator.",
    "policy": "Each account can be logged in on one device at a time. Logging in on a new device logs out the previous one."
  },
  "live": {
    "title": "Live and calls", "lead": "Live classes run on Google Meet at scheduled times. Speaking calls are 15-minute 1:1 sessions at a time you choose.",
    "liveHow": "Live classes", "liveHowBody": "Schedules are visible to Standard and Premium students. The join link opens 30 minutes before the start.",
    "callHow": "15-minute speaking calls", "callHowBody": "Each plan includes a set number of calls per month. Book and check your schedule in My Class.",
    "goMyclass": "Book in My Class", "empty": "No live classes scheduled."
  },
  "board": {
    "title": "Notices and Q&A", "notices": "Notices", "qa": "Q&A", "emptyNotices": "No notices yet.",
    "qaLocked": "Q&A is for enrolled students. Log in to see the boards for your courses.",
    "emptyQa": "No questions yet. Ask the first one.", "write": "Ask a question", "titleLabel": "Title", "bodyLabel": "Question",
    "private": "Private (only you and the instructor can see it)", "submit": "Post question", "comment": "Comments", "commentSubmit": "Post comment",
    "instructor": "Instructor", "privateBadge": "Private", "back": "Back to list", "delete": "Delete", "answered": "Answered", "waiting": "Waiting for reply",
    "noAccess": "You do not have access to this post."
  },
  "myclass": {
    "title": "My Class", "pendingTitle": "Waiting for approval", "pendingBody": "Your account is ready. Your courses will appear here once the instructor approves them. If you have not applied yet, send an application first.",
    "blockedTitle": "This account is suspended", "blockedBody": "Contact the instructor for details.",
    "tabs": { "courses": "My courses", "quizzes": "Practice and exams", "schedule": "Schedule", "calls": "Book a call", "questions": "My questions" },
    "noCourses": "You are not enrolled in any course.", "expires": "Until {date}", "tier": "Plan",
    "lessons": "Lessons", "completed": "Done", "markDone": "Mark as done", "markUndo": "Mark as not done", "materials": "Download materials",
    "noVideo": "The video has not been uploaded yet.", "progress": "{done} of {total} done",
    "quizPractice": "Practice", "quizMock": "Mock exam", "minutes": "{n} min", "attemptsLeft": "{n} attempts left", "noQuizzes": "No practice sets open yet.",
    "start": "Start", "continue": "Continue", "viewResult": "See result", "noMoreAttempts": "No attempts left.",
    "creditsLeft": "{n} speaking calls left this month", "noCredits": "No speaking calls left this month, or your plan does not include calls.",
    "book": "Book a 15-minute call", "bookNotReady": "The booking link is not ready yet.", "upcoming": "Upcoming", "noUpcoming": "Nothing scheduled.",
    "call": "Speaking call", "liveClass": "Live", "join": "Join", "linkSoon": "Link opens 30 minutes before the start",
    "today": "Today", "prev": "Previous month", "next": "Next month", "localTime": "Times are shown in this device's time zone.",
    "noQuestions": "You have not posted any questions.", "goBoard": "Go to Q&A"
  },
  "quiz": {
    "timeLeft": "Time left", "submit": "Submit", "submitting": "Submitting", "confirm": "You cannot change answers after submitting. Submit now?",
    "autoSubmitted": "Time is up. Your answers were submitted.", "answerPlaceholder": "Type your answer", "essayPlaceholder": "Write your answer",
    "resultTitle": "Result", "score": "Score", "pendingGrade": "Written answers waiting for grading", "correct": "Correct", "wrong": "Incorrect", "yourAnswer": "Your answer",
    "answer": "Answer", "explanation": "Explanation", "noAnswer": "No answer", "back": "Back to practice", "pick": "Choose one", "pickMany": "Choose all that apply",
    "error": "Could not load the questions."
  },
  "footer": { "contact": "Contact", "terms": "Terms of use", "privacy": "Privacy policy", "rights": "All rights reserved." },
  "legal": { "draft": "This page is being drafted and will be posted before the official launch." },
  "common": { "notFound": "Page not found.", "home": "Go home", "forbidden": "You do not have access to this page.", "save": "Save", "cancel": "Cancel" }
}
```

## 부록 E. 콘텐츠 데이터

### 과목
`content/categories.ts`

```ts
export const CATEGORY_SLUGS = ["es-conversation", "es-school", "ko-conversation", "topik"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

type L = { ko: string; en: string };
type LL = { ko: string[]; en: string[] };

export type CategoryInfo = {
  slug: CategorySlug;
  lang: "es" | "ko";
  name: L;
  short: L;
  audience: L;
  curriculum: LL;
  includes: LL;
};

const includesCommon: LL = {
  ko: ["과목별 영상 강의", "연습 문제와 모의고사", "15분 1:1 회화 콜 (스탠다드 이상)", "라이브 수업 (스탠다드 이상)", "과목별 Q&A 게시판"],
  en: ["Video lessons for this course", "Practice sets and mock exams", "15-minute 1:1 speaking calls (Standard and up)", "Live classes (Standard and up)", "Course Q&A board"],
};

export const categories: CategoryInfo[] = [
  {
    slug: "es-conversation",
    lang: "es",
    name: { ko: "스페인어 회화", en: "Spanish conversation" },
    short: { ko: "여행, 업무, 유학에서 바로 쓰는 말하기", en: "Speaking you can use for travel, work and study" },
    audience: { ko: "실제 대화를 목표로 스페인어를 배우는 대학생과 성인", en: "University students and adults who want to hold real conversations in Spanish" },
    curriculum: {
      ko: ["발음과 기본 문장 구조", "자기소개와 일상 대화", "과거·미래 시제로 경험과 계획 말하기", "의견 말하기와 짧은 토론"],
      en: ["Pronunciation and basic sentence structure", "Introductions and everyday conversation", "Talking about past experiences and plans", "Giving opinions and short discussions"],
    },
    includes: includesCommon,
  },
  {
    slug: "es-school",
    lang: "es",
    name: { ko: "스페인어 내신", en: "Spanish for school exams" },
    short: { ko: "외고·국제고 스페인어 내신 대비", en: "School exam prep for Korean high schools" },
    audience: { ko: "스페인어 내신을 준비하는 외고·국제고 학생", en: "Korean high school students preparing for Spanish school exams" },
    curriculum: {
      ko: ["교과서 단원별 문법 정리", "서술형 작문 연습", "듣기·독해 유형 훈련", "학교별 시험 유형 모의고사"],
      en: ["Grammar by textbook unit", "Written answer practice", "Listening and reading drills", "Mock exams in school exam format"],
    },
    includes: includesCommon,
  },
  {
    slug: "ko-conversation",
    lang: "ko",
    name: { ko: "한국어 회화", en: "Korean conversation" },
    short: { ko: "외국인 학습자를 위한 한국어 말하기", en: "Speaking Korean in everyday situations" },
    audience: { ko: "한국어를 배우는 외국인 학습자", en: "Learners of Korean, including Sejong Institute students" },
    curriculum: {
      ko: ["한글과 발음", "자주 쓰는 일상 표현", "존댓말과 반말 구분", "식당, 쇼핑, 학교 등 상황별 대화"],
      en: ["Hangul and pronunciation", "Common everyday expressions", "Formal and informal speech", "Situations: restaurants, shopping, school"],
    },
    includes: includesCommon,
  },
  {
    slug: "topik",
    lang: "ko",
    name: { ko: "TOPIK", en: "TOPIK" },
    short: { ko: "TOPIK I·II 영역별 대비와 실전 모의고사", en: "TOPIK I and II prep by section, with timed mock tests" },
    audience: { ko: "TOPIK I 또는 II 응시 예정자", en: "Learners preparing for TOPIK I or II" },
    curriculum: {
      ko: ["등급별 필수 어휘·문법", "듣기 유형별 풀이", "읽기 유형별 풀이", "쓰기 51~54번 답안 작성", "시간 제한 실전 모의고사"],
      en: ["Core vocabulary and grammar by level", "Listening by question type", "Reading by question type", "Writing questions 51 to 54", "Timed mock tests"],
    },
    includes: includesCommon,
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
```

### 단계 기본값
`content/tiers.ts`

```ts
// 블루프린트 5.3. price_krw null 이면 "준비 중" 표시
export type TierInfo = {
  slug: "basic" | "standard" | "premium";
  name: { ko: string; en: string };
  priceKrw: number | null;
  monthlyCalls: number;
  live: boolean;
};

export const tiers: TierInfo[] = [
  { slug: "basic", name: { ko: "베이직", en: "Basic" }, priceKrw: null, monthlyCalls: 0, live: false },
  { slug: "standard", name: { ko: "스탠다드", en: "Standard" }, priceKrw: null, monthlyCalls: 2, live: true },
  { slug: "premium", name: { ko: "프리미엄", en: "Premium" }, priceKrw: null, monthlyCalls: 4, live: true },
];

export const TIER_RANK = { basic: 1, standard: 2, premium: 3 } as const;
```

### 강사
`content/instructor.ts`

```ts
// 강사 소개. name 이 null 이면 이름 줄을 숨긴다
export const instructor = {
  name: null as null | { ko: string; en: string },
  photo: null as null | string,
};
```

## 부록 F. 참고 구현 (타입체크·빌드 통과, 실제 Supabase로는 미검증)

이 부분은 그대로 복사하지 말고 구조 참고용. P3 이후 실제 연결 테스트로 확인할 것.

### package.json (의존성·스크립트)

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.10",
    "next": "^15.5.28",
    "next-intl": "^3.26.5",
    "pretendard": "^1.3.9",
    "react": "^19.1.10",
    "react-dom": "^19.1.10",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@playwright/test": "1.56.0",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.4",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.5.28",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test",
    "test:db": "bash supabase/tests/run.sh"
  }
}
```

### next.config.ts
`next.config.ts`

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { authInterrupts: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

### tailwind.config.ts
`tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F7FB",
        ink: "#16213E",
        muted: "#5A6278",
        line: "#D9DDEA",
        azul: { DEFAULT: "#2443B8", deep: "#17307F", soft: "#E3E8FA" },
        azafran: { DEFAULT: "#E9A800", soft: "#FCF1CF" },
        ok: "#1F7A4D",
        warn: "#A3480E",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      },
      maxWidth: { page: "72rem", prose: "40rem" },
      borderRadius: { tile: "6px" },
    },
  },
  plugins: [],
} satisfies Config;
```

### globals.css
`app/globals.css`

```css
@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

@layer base {
  html { -webkit-text-size-adjust: 100%; }
  body {
    @apply bg-paper text-ink antialiased;
    font-feature-settings: "ss06";
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  h1, h2, h3 { @apply text-ink; letter-spacing: -0.02em; }
  :focus-visible { outline: 3px solid #E9A800; outline-offset: 2px; }
  a { text-underline-offset: 3px; }
}

@layer components {
  .wrap { @apply mx-auto w-full max-w-page px-5 sm:px-8; }
  .btn { @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-tile px-5 text-[15px] font-semibold transition-colors; }
  .btn-primary { @apply btn bg-azul text-white hover:bg-azul-deep; }
  .btn-quiet { @apply btn border border-line bg-white text-ink hover:border-azul hover:text-azul; }
  .btn-ghost { @apply btn text-azul hover:bg-azul-soft; }
  .btn[disabled], .btn[aria-disabled="true"] { @apply cursor-not-allowed border-line bg-line/60 text-muted hover:bg-line/60 hover:text-muted; }
  .field { @apply block w-full rounded-tile border border-line bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-azul focus:outline-none; }
  .label { @apply mb-1.5 block text-sm font-semibold text-ink; }
  .panel { @apply rounded-tile border border-line bg-white; }
  .h-page { @apply text-[28px] font-extrabold leading-tight sm:text-[36px]; }
  .h-section { @apply text-[22px] font-extrabold leading-snug sm:text-[28px]; }
  .lead { @apply max-w-prose text-[16px] leading-relaxed text-muted; }
  .badge { @apply inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

### eslint.config.mjs
`eslint.config.mjs`

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  { ignores: ["node_modules/**", ".next/**", "handoff/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
```

### i18n 라우팅
`i18n/routing.ts`

```ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

### i18n 요청 설정
`i18n/request.ts`

```ts
import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as Locale)) locale = routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Seoul",
  };
});
```

### 미들웨어 (i18n + 세션 갱신 + 1계정 1세션)
`middleware.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieList = { name: string; value: string; options: CookieOptions }[];
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/session";

const intl = createIntlMiddleware(routing);
const PROTECTED = [/^\/(en\/)?(myclass|admin|apply)(\/|$)/];

export async function middleware(request: NextRequest) {
  const response = intl(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: CookieList) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user || !PROTECTED.some((re) => re.test(path))) return response;

  // 1계정 1세션: 쿠키 토큰과 DB 토큰 비교
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const { data } = await supabase.from("user_sessions").select("session_token").eq("user_id", user.id).maybeSingle();
  if (!cookieToken || !data || data.session_token !== cookieToken) {
    await supabase.auth.signOut({ scope: "local" });
    const prefix = path.startsWith("/en") ? "/en" : "";
    const target = new URL(`${prefix}/login?reason=other_device`, request.url);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
```

### Supabase 서버 클라이언트
`lib/supabase/server.ts`

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieList = { name: string; value: string; options: CookieOptions }[];
import { cookies } from "next/headers";
import { env, supabaseConfigured } from "@/lib/env";

export async function createClient() {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: CookieList) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서 호출된 경우. 미들웨어가 세션을 갱신한다
        }
      },
    },
  });
}
```

### Supabase service role (웹훅 전용)
`lib/supabase/admin.ts`

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// service role 클라이언트. 웹훅 전용. 클라이언트 코드에서 import 금지
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) throw new Error("Supabase service role is not configured");
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

### 인증 헬퍼
`lib/auth.ts`

```ts
import "server-only";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  locale: "ko" | "en";
  role: "admin" | "student";
  status: "pending" | "approved" | "blocked";
};

export async function getViewer() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { supabase, user, profile: profile ?? null } as const;
}

function loginPath(locale: string, next: string) {
  const base = locale === "ko" ? "" : `/${locale}`;
  return `${base}/login?next=${encodeURIComponent(next)}`;
}

export async function requireUser(locale: string, next: string) {
  const v = await getViewer();
  if (!v.supabase || !v.user || !v.profile) redirect(loginPath(locale, next));
  return { supabase: v.supabase, user: v.user, profile: v.profile };
}

export async function requireAdmin(locale: string, next: string) {
  const v = await requireUser(locale, next);
  if (v.profile.role !== "admin" || v.profile.status !== "approved") {
    forbidden();
  }
  return v;
}

export function localePath(locale: string, path: string) {
  return locale === "ko" ? path : `/${locale}${path === "/" ? "" : path}`;
}
```

### next 경로 검사
`lib/safe-next.ts`

```ts
// 로그인 후 이동 경로는 사이트 내부 경로만 허용
export function safeNext(next: string | null | undefined, fallback = "/myclass"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
```

### 로그인 콜백 (세션 토큰 발급)
`app/auth/callback/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();
  if (!supabase || !code) return NextResponse.redirect(`${origin}/login?reason=failed`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?reason=failed`);

  // 새 세션 토큰 발급. 이전 기기는 다음 요청에서 로그아웃된다
  const token = randomUUID();
  const { error: claimError } = await supabase.rpc("claim_session", {
    p_token: token,
    p_user_agent: request.headers.get("user-agent") ?? "",
  });
  if (claimError) return NextResponse.redirect(`${origin}/login?reason=failed`);

  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
```

### 로그아웃
`app/auth/signout/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

### Cal.com 웹훅
`app/api/cal/webhook/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_SLUGS } from "@/content/categories";

// Cal.com 웹훅. 서명 검증 후 call_bookings 기록 (블루프린트 7.3)
// 예약 링크에 metadata[user_id], metadata[category] 를 붙여 보낸다

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    uid?: string; rescheduleUid?: string; fromReschedule?: string;
    startTime?: string; endTime?: string;
    attendees?: { email?: string }[];
    metadata?: { user_id?: string; category?: string; videoCallUrl?: string };
    responses?: { email?: { value?: string } };
    videoCallData?: { url?: string };
  };
};

function verify(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await request.text();
  if (!verify(raw, request.headers.get("x-cal-signature-256"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: CalPayload;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const event = body.triggerEvent;
  const p = body.payload ?? {};
  if (!p.uid) return NextResponse.json({ ok: true, ignored: true });

  const db = createAdminClient();

  if (event === "BOOKING_CANCELLED") {
    await db.from("call_bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("cal_uid", p.uid);
    return NextResponse.json({ ok: true });
  }
  if (event !== "BOOKING_CREATED" && event !== "BOOKING_RESCHEDULED") return NextResponse.json({ ok: true, ignored: true });

  const email = p.attendees?.[0]?.email ?? p.responses?.email?.value ?? null;
  let userId = p.metadata?.user_id ?? null;
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) userId = null;
  if (!userId && email) {
    const { data } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
    userId = data?.id ?? null;
  }
  const category = (CATEGORY_SLUGS as readonly string[]).includes(p.metadata?.category ?? "") ? p.metadata!.category! : null;

  // 일정 변경: 이전 예약은 취소 처리하고 새 예약을 기록
  const previous = p.rescheduleUid ?? p.fromReschedule;
  if (event === "BOOKING_RESCHEDULED" && previous) {
    await db.from("call_bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("cal_uid", previous);
  }

  // 크레딧 초과 예약은 over_limit 으로 표시해 관리자가 확인한다
  let status: "accepted" | "over_limit" = "accepted";
  const { data: existing } = await db.from("call_bookings").select("status").eq("cal_uid", p.uid).maybeSingle();
  if (existing && existing.status !== "cancelled") {
    status = existing.status as "accepted" | "over_limit";
  } else if (userId && category && p.startTime) {
    const { data: credits } = await db.rpc("call_credits_for", { p_user: userId, p_category: category, p_at: p.startTime });
    if (typeof credits === "number" && credits <= 0) status = "over_limit";
  }

  const { error } = await db.from("call_bookings").upsert({
    cal_uid: p.uid, user_id: userId, category, attendee_email: email,
    starts_at: p.startTime, ends_at: p.endTime, status,
    meet_url: p.videoCallData?.url ?? p.metadata?.videoCallUrl ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "cal_uid" });
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
```

### Cal.com 예약 링크
`lib/cal.ts`

```ts
// 과목별 Cal.com 예약 링크 (공개 환경변수)
const links: Record<string, string | undefined> = {
  "es-conversation": process.env.NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION,
  "es-school": process.env.NEXT_PUBLIC_CAL_LINK_ES_SCHOOL,
  "ko-conversation": process.env.NEXT_PUBLIC_CAL_LINK_KO_CONVERSATION,
  topik: process.env.NEXT_PUBLIC_CAL_LINK_TOPIK,
};

export function calBookingUrl(category: string, user: { id: string; email: string; name: string | null }) {
  const base = links[category];
  if (!base || !/^https:\/\//.test(base)) return null;
  const url = new URL(base);
  url.searchParams.set("email", user.email);
  if (user.name) url.searchParams.set("name", user.name);
  url.searchParams.set("metadata[user_id]", user.id);
  url.searchParams.set("metadata[category]", category);
  return url.toString();
}
```

### 결제 스페이서 인터페이스
`lib/payments/index.ts`

```ts
// 결제 스페이서 (블루프린트 7.7). 정식 런칭 때 구현한다.
// 결제 완료 시 해야 할 일은 하나: service role 로 grant_access(..., source => 'payment') 호출.

export type CheckoutInput = { userId: string; category: string; tier: "basic" | "standard" | "premium"; months: number };
export type CheckoutSession = { redirectUrl: string; orderId: string };
export type PaymentEvent = { orderId: string; status: "paid" | "cancelled" | "failed"; userId: string; category: string; tier: string; months: number };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent | null>;
}

export const PAYMENTS_ENABLED = false;

export { tossProvider } from "./toss";
```

### 결제 웹훅 501
`app/api/payments/webhook/route.ts`

```ts
import { NextResponse } from "next/server";

// 결제 스페이서: 정식 런칭 전까지 501
export async function POST() {
  return NextResponse.json({ error: "payments_not_enabled" }, { status: 501 });
}
```

### 유효 권한 조회
`lib/data/student.ts`

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_SLUGS } from "@/content/categories";
import type { Profile } from "@/lib/auth";

export type Ent = { id: string; category: string; tier: "basic" | "standard" | "premium"; starts_at: string; expires_at: string };

// 지금 유효한 권한. 같은 과목이 여러 개면 가장 높은 단계, 가장 늦은 만료
export async function activeEntitlements(supabase: SupabaseClient, profile: Profile): Promise<Ent[]> {
  if (profile.status !== "approved") return [];
  const now = new Date().toISOString();
  const { data } = await supabase.from("entitlements").select("id,category,tier,starts_at,expires_at")
    .eq("user_id", profile.id).lte("starts_at", now).gt("expires_at", now);
  const rank = { basic: 1, standard: 2, premium: 3 } as const;
  const best = new Map<string, Ent>();
  for (const e of (data as Ent[]) ?? []) {
    const cur = best.get(e.category);
    if (!cur || rank[e.tier] > rank[cur.tier] || (rank[e.tier] === rank[cur.tier] && e.expires_at > cur.expires_at)) best.set(e.category, e);
  }
  return CATEGORY_SLUGS.flatMap((s) => (best.has(s) ? [best.get(s)!] : []));
}

export async function readableCategories(supabase: SupabaseClient, profile: Profile): Promise<string[]> {
  if (profile.role === "admin" && profile.status === "approved") return [...CATEGORY_SLUGS];
  return (await activeEntitlements(supabase, profile)).map((e) => e.category);
}
```

### 관리자 입력 변환
`lib/admin-utils.ts`

```ts
// 관리자 입력값 변환. 날짜는 서울 기준
export function kstDayStart(d: string) { return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+09:00` : null; }
export function kstDayEnd(d: string) { return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59+09:00` : null; }
export function kstLocal(dt: string) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt) ? `${dt}:00+09:00` : null; }

export function kstDateInput(iso: string | Date) {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // YYYY-MM-DD
}
export function kstDateTimeInput(iso: string) {
  const d = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function kstLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function parseVideo(input: string): { provider: "youtube" | "vimeo"; id: string | null } {
  const s = input.trim();
  if (!s) return { provider: "youtube", id: null };
  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { provider: "vimeo", id: vimeo[1] };
  const yt = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/);
  if (yt) return { provider: "youtube", id: yt[1] };
  if (/^\d{6,12}$/.test(s)) return { provider: "vimeo", id: s };
  if (/^[A-Za-z0-9_-]{6,20}$/.test(s)) return { provider: "youtube", id: s };
  return { provider: "youtube", id: null };
}

export function lines(s: string) { return s.split("\n").map((x) => x.trim()).filter(Boolean); }
```

### [locale] 레이아웃
`app/[locale]/layout.tsx`

```tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// 로그인 상태에 따라 헤더가 달라지므로 모든 페이지를 요청 시 렌더
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { default: t("title"), template: `%s | ${t("title")}` }, description: t("description") };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6F7FB" };

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("nav");
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-tile focus:bg-white focus:px-3 focus:py-2">
          {t("skip")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <SiteHeader locale={locale} />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 히어로
`components/home/Hero.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function Hero() {
  const t = await getTranslations("home");
  return (
    <section className="wrap pb-16 pt-14 sm:pt-20">
      <h1 className="max-w-5xl text-[clamp(2.3rem,7.2vw,5rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">
        <span aria-hidden className="mr-[0.08em] text-azafran">{t("heroBefore")}</span>
        {t("heroQuestion")}
        <span aria-hidden className="ml-[0.06em] text-azafran">{t("heroAfter")}</span>
      </h1>
      <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-muted sm:text-[18px]">{t("heroLead")}</p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/apply" className="btn-primary">{t("ctaApply")}</Link>
        <a href="#courses" className="btn-quiet">{t("ctaCourses")}</a>
      </div>
    </section>
  );
}
```

### 워터마크
`components/myclass/Watermark.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";

const SPOTS = [
  { top: "8%", left: "6%" }, { top: "70%", left: "58%" }, { top: "40%", left: "30%" },
  { top: "15%", left: "62%" }, { top: "78%", left: "8%" }, { top: "50%", left: "70%" },
];

// 영상 위 반투명 이메일. 20초마다 위치 이동 (블루프린트 6.4)
export function Watermark({ text }: { text: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SPOTS.length), 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <span aria-hidden data-testid="watermark"
      className="pointer-events-none absolute z-10 select-none whitespace-nowrap text-[13px] font-semibold text-white/45 [text-shadow:0_0_2px_rgba(0,0,0,.6)]"
      style={SPOTS[i]}>
      {text}
    </span>
  );
}
```

### 퀴즈 응시 (타이머·자동 제출)
`components/myclass/QuizRunner.tsx`

```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitAttempt } from "@/app/[locale]/myclass/actions";

export type Q = { id: string; type: "mcq_single" | "mcq_multi" | "short_text" | "essay"; prompt: string; choices: string[]; points: number };

export function QuizRunner({ attemptId, questions, deadline, serverNow }: { attemptId: string; questions: Q[]; deadline: string | null; serverNow: number }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const [resp, setResp] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const offset = useRef(serverNow - Date.now());
  const [left, setLeft] = useState<number | null>(deadline ? new Date(deadline).getTime() - serverNow : null);
  const respRef = useRef(resp);
  respRef.current = resp;

  const submit = useCallback(async (isAuto: boolean) => {
    if (busy) return;
    setBusy(true);
    if (isAuto) setAuto(true);
    const res = await submitAttempt(attemptId, respRef.current);
    if (res.ok) router.refresh(); else setBusy(false);
  }, [attemptId, busy, router]);

  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const id = setInterval(() => {
      const ms = end - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) { clearInterval(id); submit(true); }
    }, 500);
    return () => clearInterval(id);
  }, [deadline, submit]);

  const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <div>
      {left !== null && (
        <div className="sticky top-16 z-20 -mx-5 mb-6 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-tile sm:border sm:px-4" role="timer" aria-live="off">
          <span className="text-sm text-muted">{t("timeLeft")}</span>{" "}
          <span className={`text-[20px] font-extrabold tabular-nums ${left < 60000 ? "text-warn" : ""}`} data-testid="time-left">{mmss(left)}</span>
        </div>
      )}
      {auto && <p role="status" className="mb-6 rounded-tile border border-azafran bg-azafran-soft p-4">{t("autoSubmitted")}</p>}
      <ol className="space-y-6">
        {questions.map((q, i) => (
          <li key={q.id} className="panel p-5" data-qtype={q.type}>
            <p className="whitespace-pre-line text-[17px] font-semibold"><span className="mr-2 text-muted">{i + 1}.</span>{q.prompt}</p>
            {q.type === "mcq_single" && (
              <fieldset className="mt-4 space-y-2">
                <legend className="sr-only">{t("pick")}</legend>
                {q.choices.map((c, ci) => (
                  <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-tile border border-line px-3 py-2.5 has-[:checked]:border-azul has-[:checked]:bg-azul-soft">
                    <input type="radio" name={q.id} className="mt-1 accent-azul" checked={resp[q.id] === ci} onChange={() => setResp({ ...resp, [q.id]: ci })} />
                    <span>{c}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {q.type === "mcq_multi" && (
              <fieldset className="mt-4 space-y-2">
                <legend className="mb-2 text-sm text-muted">{t("pickMany")}</legend>
                {q.choices.map((c, ci) => {
                  const cur = (resp[q.id] as number[] | undefined) ?? [];
                  const on = cur.includes(ci);
                  return (
                    <label key={ci} className="flex cursor-pointer items-start gap-3 rounded-tile border border-line px-3 py-2.5 has-[:checked]:border-azul has-[:checked]:bg-azul-soft">
                      <input type="checkbox" className="mt-1 accent-azul" checked={on} onChange={() => setResp({ ...resp, [q.id]: on ? cur.filter((x) => x !== ci) : [...cur, ci] })} />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            {q.type === "short_text" && (
              <input className="field mt-4" placeholder={t("answerPlaceholder")} aria-label={`${i + 1}`} value={(resp[q.id] as string) ?? ""} onChange={(e) => setResp({ ...resp, [q.id]: e.target.value })} />
            )}
            {q.type === "essay" && (
              <textarea className="field mt-4" rows={6} placeholder={t("essayPlaceholder")} aria-label={`${i + 1}`} value={(resp[q.id] as string) ?? ""} onChange={(e) => setResp({ ...resp, [q.id]: e.target.value })} />
            )}
          </li>
        ))}
      </ol>
      <button className="btn-primary mt-8 w-full sm:w-auto" disabled={busy} data-testid="submit-quiz"
        onClick={() => { if (window.confirm(t("confirm"))) submit(false); }}>
        {busy ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
```

---
끝.
