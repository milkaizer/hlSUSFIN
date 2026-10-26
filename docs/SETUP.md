# 사람이 할 일 (HANDOFF 14장 기준, 현재 코드에 맞춰 보완)

순서대로 하면 됩니다. 비밀값(키, 시크릿)은 채팅에 붙여 넣지 말고 아래에 적힌 곳에만 넣으세요.

## 1. Supabase (P3 전에 필요)

1. supabase.com 가입, New project 생성. 리전은 Northeast Asia (Seoul).
2. Project Settings > API 에서 세 값을 복사합니다.
   - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key: `SUPABASE_SERVICE_ROLE_KEY` (절대 공개하지 않음)
3. SQL Editor 에서 아래 파일을 이 순서로 각각 실행합니다. 파일 내용을 통째로 붙여 넣고 Run.
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_admin_functions.sql` (HANDOFF 이후 추가된 관리자 함수)
   3. `supabase/seed.sql`
4. Authentication > URL Configuration
   - Site URL: `http://localhost:3000` (배포 후 운영 주소로 변경)
   - Redirect URLs: `http://localhost:3000/auth/callback`, 배포 후 `https://<도메인>/auth/callback` 추가
5. Authentication > Providers > Email: 활성 (매직링크)
6. (선택, 권장) Authentication > Email Templates 에서 **Magic Link** 와 **Confirm signup** 두 템플릿의 링크 주소(`{{ .ConfirmationURL }}` 자리)를 아래로 바꾸면, 학생이 메일을 다른 브라우저나 휴대폰 메일 앱에서 열어도 로그인됩니다. 처음 가입하는 학생은 Confirm signup 메일을 받으므로 둘 다 바꿉니다.
   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
   ```
   바꾸지 않으면 링크를 요청한 같은 브라우저에서 열어야 로그인됩니다 (로그인 화면에 안내문이 있음).
7. Google 로그인
   - Google Cloud Console > API 및 서비스 > OAuth 동의 화면: 외부, 테스트 사용자 추가 또는 게시
   - 사용자 인증 정보 > OAuth 클라이언트 ID (웹 애플리케이션) 생성
   - 승인된 리디렉션 URI: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`
   - 받은 Client ID, Client Secret 을 Supabase > Authentication > Providers > Google 에 입력
8. 본인 계정으로 사이트에서 한 번 로그인한 뒤 SQL Editor 에서 관리자로 지정합니다.
   ```sql
   update public.profiles set role = 'admin', status = 'approved' where email = '본인이메일';
   ```

## 2. 키를 넣는 곳

### 본인 PC 에서 실행할 때
프로젝트 폴더에 `.env.local` 을 만들고 `.env.example` 의 키 이름에 값을 채웁니다. 이 파일은 git 에 올라가지 않습니다.

### Claude Code 클라우드 세션에서 E2E 를 돌릴 때
1. 세션 제목 표시줄의 클라우드 환경 메뉴 > Edit
2. 환경변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 추가
3. Network access 의 Allowed domains 에 `<프로젝트 ref>.supabase.co` 추가 (지금 환경은 Supabase 도메인이 막혀 있음. Allow package managers 체크는 유지)
4. 새 세션을 열어야 반영됩니다. 새 세션에서 `bash scripts/test-app.sh` 를 실행하라고 하면 13.3~13.7 E2E 가 돕니다.

E2E 는 실제 프로젝트에 `vita-e2e-...@example.com` 테스트 사용자와 `E2E ...` 이름의 강의, 문제, 라이브를 만들고 끝나면 지웁니다.

## 3. Cal.com (P6, 회화 콜 예약)

1. Cal.com 가입, Google Calendar 연결, 기본 회의 앱을 Google Meet 으로
2. 과목별 15분 이벤트 4개 생성 후 각 링크를 환경변수에
   - `NEXT_PUBLIC_CAL_LINK_ES_CONVERSATION`, `NEXT_PUBLIC_CAL_LINK_ES_SCHOOL`, `NEXT_PUBLIC_CAL_LINK_KO_CONVERSATION`, `NEXT_PUBLIC_CAL_LINK_TOPIK`
3. Settings > Developer > Webhooks
   - URL: `https://<도메인>/api/cal/webhook`
   - 이벤트: Booking Created, Booking Cancelled, Booking Rescheduled
   - 시크릿을 정해서 같은 값을 `CAL_WEBHOOK_SECRET` 에
4. 연결 후 Cal.com 화면의 테스트 웹훅(Ping)을 한 번 보내 보고, 실제 예약을 하나 만들어 관리자 > 회화콜 화면에 들어오는지 확인합니다. payload 필드 이름이 다르면 알려 주세요 (HANDOFF 10.3).
5. 로컬에서 서명 맞춘 가짜 요청 보내기
   ```
   CAL_WEBHOOK_SECRET=... node scripts/cal-webhook-test.mjs created <학생 user_id>
   ```

## 4. 배포 (P10)

1. GitHub 저장소 (private). 지금 이 세션은 `milkaizer/hlSUSFIN` 에 push 권한이 없습니다. https://claude.ai/connect-github 에서 GitHub 를 다시 연결하고, 저장소에 Claude GitHub App 을 설치해 주세요.
2. Vercel 가입 > 저장소 import > 환경변수 입력 (`.env.example` 의 전체 목록, `NEXT_PUBLIC_SITE_URL` 은 운영 주소) > 배포
3. Supabase Site URL, Redirect URLs, Google OAuth, Cal.com 웹훅 URL 을 운영 주소로 갱신

## 5. 학생 초대 전

- 이용약관, 개인정보처리방침 실제 문구 (미성년 학생이 있으므로 수집 항목과 보관 기간 명시)
- 강의 1개 이상, 레슨 몇 개, 문제 세트 1개 등록
- 세종학당 수강생 대상 사용은 학당 강사 규정 확인
