# P3 to P7 independent verification

Date: 2026-10-26 (about 09:40 to 10:05 UTC). Verifier: separate subagent. Read-only on source: this report is the only file I wrote.

Target: HEAD `356556e`. The P3 to P7 code is commit `933ad92`; `356556e` only adds `docs/student-guide.md`. The working tree is clean, and I checked that the lines I cite are in the committed code.

How I verified (there is no Supabase, GoTrue or PostgREST in this container, so no E2E spec was run):
- I read all of `app/`, `components/`, `lib/`, `middleware.ts`, both migrations, `messages/` and `tests/e2e/p3-p7` plus helpers.
- I built my own DB `vita_verify` (auth stub without the role creation, then 0001, 0002, seed and my own fixtures). I replayed the app's queries in the shape PostgREST sends them: `set role authenticated|anon|service_role` with `request.jwt.claims`, `RETURNING 1` for supabase-js calls without `.select()`, and `RETURNING <cols>` for `.insert().select()`.
- I built the app into an isolated `.next-verify` with empty Supabase env and ran `next start` on :3197 to check the RSC payload, the webhook signature paths, payments 501 and the client bundle.
- I ran the existing `.next-p1` build on :3198 to see how percent-encoded protected paths are routed.
- I ran `bash supabase/tests/run.sh`, after dropping `vita_verify` and checking that no other DB session was active.

Command results:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no output |
| `npx eslint .` | exit 0, no output |
| `bash supabase/tests/run.sh` | exit 0. `rls_test.sql` 60 pass, 0 fail. `app_test.sql` 37 pass, 0 fail |
| `NEXT_DIST_DIR=.next-verify npx next build` (empty Supabase env) | exit 0 |

Cleanup: the isolated build rewrote `tsconfig.json` (reformatted, with `.next-verify/types` added) and repointed `next-env.d.ts`. I restored `tsconfig.json` to HEAD (666 bytes, the same as before the build) and pointed `next-env.d.ts` back at `.next-flags` (268 bytes, as before). I deleted `.next-verify` and dropped `vita_verify`. I stopped my probe servers by PID. I did not touch the other agents' next-server processes (3204, 10344).

## 13.3 P3 login and session

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | New email login: pending profile, "승인 대기" | CANNOT-VERIFY-WITHOUT-SUPABASE | The code path is correct. The `handle_new_user` trigger creates a pending profile. The callback accepts `code` (PKCE) or `token_hash`, then calls `claim_session`, sets the `vita_sid` cookie (httpOnly, Lax, 30 days) and redirects. My Class renders `myclass-pending`. `@supabase/ssr` 0.5.2 server storage returns freshly set items, so `claim_session` right after the code exchange does see the session. |
| 2 | Two browsers: the first one goes to `other_device` | CANNOT-VERIFY-WITHOUT-SUPABASE; rule bypassable (D2) | The middleware compares the cookie token with `user_sessions.session_token`, then signs out locally, copies the cookies, deletes `vita_sid` and redirects (with an `/en` prefix where needed). `user_sessions` own-row select verified in SQL. But the check is skipped for percent-encoded paths, which still render the protected page (D2). |
| 3 | Student `/admin` gets 403 | CANNOT-VERIFY-WITHOUT-SUPABASE | The admin layout calls `requireAdmin`, which calls `forbidden()`. `authInterrupts` is on and `app/[locale]/forbidden.tsx` exists (h1 "접근 권한이 없습니다."). There is no Suspense or `loading.tsx` above it, so the status is set before streaming. |
| 4 | Admin set by SQL can enter `/admin` | CANNOT-VERIFY-WITHOUT-SUPABASE | `isAdminProfile` requires role admin and status approved; the DB `is_admin()` checks the same. |
| 5 | Admin approves the student and grants es-conversation basic; My Class shows only that course | CANNOT-VERIFY-WITHOUT-SUPABASE | Replayed in SQL: `admin_set_profile`, `grant_access` (pending to approved), the student reading its own entitlements, and the courses + lessons embed returning only es-conversation. |
| 6 | No service role key in the client bundle | PASS (static) | `lib/supabase/admin.ts` has `import "server-only"` and is imported only by `app/api/cal/webhook/route.ts`. `.next-verify/static` contains no `createAdminClient`, "service role is not configured" or `SUPABASE_SERVICE_ROLE_KEY`. I could not test a real key value. |
| 7 | `/login?next=//evil.com` | PASS for `//`; FAIL for the tab variant (D3) | `safeNext` turns `//evil.com` into `/myclass`, and the callback redirects to `${origin}${next}`. A `next` of `/%09/evil.com` passes `safeNext`, and the login page calls `redirect(next)` for a user who is already logged in. Next sets `Location` verbatim, and browsers strip the tab, which leaves `//evil.com`. |

## 13.4 P4 courses and applications

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | Application sent: pending, shown in the admin list | CANNOT-VERIFY-WITHOUT-SUPABASE | The insert uses `RETURNING 1`. `req_insert` forces pending. The admin list embeds `profiles!enrollment_requests_user_id_fkey`; I confirmed that constraint name exists in the DB. |
| 2 | Approval goes through `grant_access` with note 'enrollment request' | CANNOT-VERIFY-WITHOUT-SUPABASE | `approve_request` calls `grant_access(..., 'enrollment request')`. My Class is dynamic, so it updates at once. |
| 3 | Lesson watermark shows the student email | CANNOT-VERIFY-WITHOUT-SUPABASE | `VideoPlayer` renders `Watermark text={profile.email}` (testid `watermark`), moving every 20 s across 6 spots. The YouTube URL is `youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1`. |
| 4 | Done toggle survives a refresh | CANNOT-VERIFY-WITHOUT-SUPABASE (SQL PASS) | `upsert(..., {onConflict, ignoreDuplicates: true})` becomes `ON CONFLICT DO NOTHING`. It works as the student on a visible lesson and is refused by RLS on a lesson above the student's tier. The delete also works. |
| 5 | Admin course and lesson CRUD shows up for students | CANNOT-VERIFY-WITHOUT-SUPABASE (SQL PASS) | Admin insert, update and delete on courses and lessons, and `courses.insert().select("id")` (allowed through `is_admin()`), all work. An unpublished course hides its lessons from students. |
| 6 | Lesson with min_tier standard, basic student: hidden from the list, direct URL 404 | CANNOT-VERIFY-WITHOUT-SUPABASE (SQL PASS) | The basic student's embed returns only L1. `lessons?id=L2` returns 0 rows, and the page calls `notFound()`. |
| 7 | Expired entitlement: gone from My Class, lesson 404 | CANNOT-VERIFY-WITHOUT-SUPABASE | `activeEntitlements` filters on the time window, and `has_access` enforces the same window (rls_test 10.2). |

## 13.5 P5 quizzes

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | Single and multiple choice, order-insensitive | PASS (SQL) | `submit_attempt` with the server action's payload (`0`, and `[2,0]` against answer `[0,2]`) marks both correct. |
| 2 | `' HOLA '` against `hola` | PASS (SQL) | Graded correct. |
| 3 | Essay: needs_grading, then graded | PASS (SQL) | Status needs_grading with score 3/6. After `grade_essay(…, 2)`: graded, 5/6. The admin grading embed `profiles(email), quizzes(title,category)` works; the embed is unambiguous because `attempt_answers` is a junction only to `questions`. |
| 4 | 1-minute mock left alone: auto-submit at 0 with a notice | CANNOT-VERIFY-WITHOUT-SUPABASE | `QuizRunner` corrects for server time with `serverNow - Date.now()`, set in an effect that runs before the timer effect. At or below 0 ms it calls `submit(true)`, then `router.replace(?auto=1)`, and the result page shows the `auto-submitted` banner. Opening the page after deadline + 2 min submits empty answers on the server. |
| 5 | One attempt used up: no start button, direct RPC raises | PASS (SQL) / UI by code | A second `start_attempt` returns the same open attempt. After submitting, it raises `max attempts reached`. The UI shows no start button when `left === 0`. |
| 6 | No answer or explanation in network responses during an attempt | PASS (SQL), E2E check broken (D4) | `quiz_questions` returns only id, type, prompt, choices, points and sort; `attempt_answers` are hidden until submission. The spec's generic regex, however, matches next-intl message keys. |

## 13.6 P6 calls and live

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | Basic: 0 calls notice, no live list | PASS (SQL) | `my_call_credits` = 0, which renders `no-credits`. The `live_sessions` select returns 0 rows because min_tier is standard. |
| 2 | Standard: 2 calls, booking link carries metadata | PASS (SQL) / link by code | Credits = 2. `calBookingUrl` requires https and sets email, name, `metadata[user_id]` and `metadata[category]`. |
| 3 | Signed BOOKING_CREATED is recorded, 1 call left | PASS (SQL replay) | As service_role: `call_credits_for` = 2, so accepted; the upsert works; the student then sees 1. |
| 4 | Same uid resent | PASS (SQL) | Status stays accepted and there is still 1 row. |
| 5 | BOOKING_CANCELLED | PASS (SQL) | The student is back to 2. |
| 6 | Bad signature: 401, nothing recorded | PASS (runtime) | On the isolated server, no signature and an all-zero signature both return 401. A valid signature gets past verification (then 500, because no service key is configured). Payments webhook returns 501. |
| 7 | Booking at 0 credits: over_limit, admin count goes up | PASS (code + SQL) | Credits at or below 0 give over_limit. The dashboard counts `status=over_limit`. Unmatched member or category is also marked over_limit (D8). |
| 8 | Live 3 h before: link hidden; 20 min before: "입장하기" | PASS (SQL) | `live_link`: 20 min returns the URL, 3 h returns null. Selecting `meet_url` or `*` as a student is refused (permission denied). The UI renders the link only from `live_link`. |
| 9 | Calendar dots, follows the browser time zone | CANNOT-VERIFY-WITHOUT-SUPABASE | `MonthCalendar` renders after mount using local `Date`: blue dots for calls, yellow for live. `LocalTime` re-renders in the browser's zone. |

## 13.7 P7 board

| # | Row | Verdict | Evidence |
|---|---|---|---|
| 1 | Logged-out user reads notices; home banner shows the latest | PASS (SQL) / code | Anon can read the notice and its comments, and sees 0 questions. `NoticeBanner` is the first `data-section`. |
| 2 | Q&A for a course without access: no tab, "권한 없음" on direct URL, 0 rows over REST | PASS (SQL) / code | Tabs come from active entitlements; `?c=topik` renders `qa-no-access`; RLS returns 0 rows. |
| 3 | Private question: 0 rows for anyone but the author and admin | FAIL (D1) | The RLS itself is correct: another student gets 0 rows for the post and its comments. But no question can be created through the app, because `createQuestion` always errors. |
| 4 | Admin comment: "강사 답변" badge, list shows "답변 완료" | FAIL (blocked by D1) | The trigger sets `is_instructor` to true for the admin, and the list badge logic is correct. There is no question to answer unless it is inserted with the service role. |
| 5 | Student inserts `is_instructor=true`: the trigger stores false | PASS (SQL) | Stored as false. |
| 6 | Results entered, flags-on rebuild: home shows only published items | PASS (code + SQL) | `getPublishedResults` uses `published=true` and RLS also requires published. The admin showcase works regardless of the flags. |

## Supabase query audit (each query replayed or reasoned against grants and RLS)

All of the queries below work for the role that runs them, except `createQuestion`:
- Middleware and auth: `user_sessions` own select; `claim_session`; `profiles` own select.
- My Class: `courses` + `lessons` embed; `lesson_progress` select, upsert and delete; `quizzes` and `attempts` selects; `live_sessions` (granted columns only); `live_link`; `my_call_credits`; `call_bookings` own rows (including the own `meet_url`); `board_posts` + `board_comments(is_instructor)`.
- Quizzes: `start_attempt`, `quiz_questions`, `submit_attempt`, `attempt_result`. The STABLE functions do not write, so the read-only RPC transaction is fine.
- Admin: profiles list and HEAD counts; entitlement and request RPCs; `credit_adjustments` insert and delete; courses, lessons and quizzes CRUD; `admin_save_question` and `admin_delete_question`; `grade_essay`; `admin_live_sessions`; `live_sessions` insert, update and delete. Update and delete filter only on `id`, which is in the column grant, and use `RETURNING 1`. Also `call_bookings` + `profiles(email)`, `board_posts` + `profiles(email)`, results and reviews CRUD, and `tiers` update (only granted columns are sent).
- Webhook (service_role): profiles lookup, existing-row read, `call_credits_for`, upsert on `cal_uid`, cancel update.
- Anon: notices, published results and reviews, tiers.

Embeds are unambiguous. `lesson_progress` and `attempt_answers` are the only junction tables, because their FK columns form the PK; `board_comments` and `attempt_answers.graded_by` do not create extra M2M paths.

Nothing leaks: answers and explanations appear only after submission or for admins; `meet_url` only through `live_link`, `admin_live_sessions` or the student's own bookings.

The one failure: `board_posts` `INSERT ... RETURNING id` raises `new row violates row-level security policy` for students and for admins (D1). The same insert with `RETURNING 1` succeeds.

## Security rules (section 9)

| Rule | Verdict | Evidence |
|---|---|---|
| Service role only in `lib/supabase/admin.ts` with `server-only` | PASS | One import, from the webhook route. No client file imports server modules. |
| `https://` check on external URLs | PASS | Materials, live link, booking Meet links and admin call Meet links all go through `safeHttpsUrl`. Cal links require https. Admin Meet input uses `isMeetUrl`; materials input uses `safeHttpsUrl`; the webhook stores Meet links only if https. No `dangerouslySetInnerHTML`. |
| Video ID regex | PASS | `isVideoId` `^[A-Za-z0-9_-]{1,64}$`; Vimeo IDs must be digits; `parseVideo` limits IDs to 6 to 20 characters. |
| UUID checked before queries | PASS | Every `[id]` page, server action and webhook `user_id` is checked. |
| Safe `next` | FAIL (D3) | A tab inside `next` slips through. |
| One account, one session (9.1) | FAIL (D2) | Percent-encoded paths skip the check. |
| Cal webhook signature, 503 without secret | PASS | Hex-format check, byte-wise `timingSafeEqual`, 512 KB cap; 401 confirmed at runtime. |

## Copy rules

| Check | Verdict | Evidence |
|---|---|---|
| No U+2014 | PASS | `grep -rlP '\xe2\x80\x94'` (U+2014 as bytes), excluding node_modules, `.next*`, .git, local-stack and test-results: 0 files. No U+2013 either. |
| No meta strings joined with a middle dot | PASS | The only `·` in code are fixed labels taken from 6.11 ("회원·권한", "합격자·후기", "합격자·성과") and comments. Meta lines join with ", ". No bullets (U+2022, U+30FB, U+22C5) and no trailing arrows. |
| Korean admin UI | PASS | Admin strings are hard-coded Korean, the wrapper has `lang="ko"`, notices are Korean, dates use ko-KR in Asia/Seoul. "웹훅" appears only in admin copy; student copy has no system terms. |
| Messages | PASS | `ko.json` and `en.json` have identical key sets, and every key used in P3 to P7 code exists. |

## E2E specs (tests/e2e/p3 to p7): would they pass against a correct implementation?

All selectors, testids and accessible names match the real markup, apart from the problems below.
- P3: correct; it depends on 13.3-3 really returning 403.
- P4: correct apart from one race (D6).
- P5: 13.5-6 fails on a correct implementation (D4), and 13.5-4 is at risk (D6).
- P6: correct, with time-of-month edge cases (D7).
- P7: 13.7-3 to 13.7-5 fail even after D1 is fixed (D5), and 13.7-6 is weak (D6).

## Defects, ordered by severity

1. **D1, blocker (P7): nobody can post a Q&A question through the app.**
   - Where: `app/[locale]/board/actions.ts:22-24` (`.insert({...}).select("id").single()`) against `supabase/migrations/0001_init.sql:653` (`posts_read using (can_read_post(id))`).
   - Why: `.select("id")` makes PostgREST send `RETURNING id`, so PostgreSQL also applies the SELECT policy to the new row. `can_read_post(id)` looks the row up in `board_posts`, where it is not yet visible, so the policy returns false.
   - Scenario: a student with es-conversation clicks "질문 올리기" and gets `/board?c=es-conversation&err=1` ("저장하지 못했습니다") every time. Admins fail the same way. Reproduced in SQL: the student and admin inserts with `RETURNING id` raise `new row violates row-level security policy for table "board_posts"`; with `RETURNING 1` they succeed. This breaks 6.7 and 13.7-3/4, and the E2E 13.7-3.
   - Fix: either (a) generate `const id = crypto.randomUUID()` in the action, insert `{ id, ... }` without `.select()`, and redirect to `/board/${id}`, or (b) add migration 0003 that recreates `posts_read` with an inline predicate: `kind = 'notice' or is_admin() or (has_access(category) and (not is_private or author_id = auth.uid()))`.
   - Also add `insert ... returning id` cases for students and admins to `app_test.sql`; none of the 37 app tests exercises this path.

2. **D2, high (security, 9.1): the one-device rule can be bypassed with percent-encoded paths.**
   - Where: `middleware.ts:10` and `:27-28` test `PROTECTED` against the raw `request.nextUrl.pathname`. `lib/auth.ts` `requireUser` never checks `vita_sid`.
   - Evidence: `new NextURL("http://h/%6Dyclass").pathname` is `/%6Dyclass`, so `PROTECTED.test` is false. Yet on the `.next-p1` build, `/%6Dyclass`, `/my%63lass`, `/en/%6Dyclass` and `/%61dmin` all reach the protected pages (they 307 to `/login?next=%2Fmyclass` or `%2Fadmin`, which only the page's own `requireUser` does).
   - Scenario: device A is kicked out by device B's login. A opens `/%6Dyclass` (or `/%61dmin`) with its still-valid Supabase cookies and gets full My Class, lessons and quizzes (server actions post to the same encoded URL), so account sharing keeps working.
   - Fix: decode the path before testing it (`decodeURIComponent` in try/catch; treat a decode failure as protected), or run the token check for every request that has a user. Also enforce the token in `requireUser`/`getViewer`, comparing `cookies().get("vita_sid")` with `user_sessions`, so pages and server actions are covered whatever the URL shape.

3. **D3, medium (security): open redirect via control characters in `next`.**
   - Where: `lib/safe-next.ts:3-4` rejects only `//`, `/\` and CR/LF. `app/[locale]/login/page.tsx:21,25` calls `redirect(next)` when the user is already logged in.
   - Scenario: a logged-in user follows `https://<site>/login?next=/%09/evil.com`. Next writes `Location: /<TAB>/evil.com` verbatim (`app-render.js` `setHeader('location', redirectUrl)`). The browser strips the tab, leaving `//evil.com`, which resolves to `https://evil.com/` (checked with WHATWG `URL`).
   - Fix: reject any control character or whitespace (`/[\u0000-\u001F\u007F\s\\]/`), or normalise: `const u = new URL(next, "http://x"); if (u.origin !== "http://x") return fallback; return u.pathname + u.search + u.hash;`.

4. **D4, medium (E2E): 13.5-6 fails against a correct implementation.**
   - Where: `tests/e2e/p5-quiz.spec.ts:84` asserts that no response matches `/"(answer|explanation)"\s*:/`.
   - Why: clicking `start-quiz` runs a server action that redirects. Next 15.5 renders the redirect target with the router state tree removed (`action-handler.js:281`), so the action response carries the full tree, including the `[locale]` layout's `NextIntlClientProvider` messages. Those contain `quiz.answer` ("정답") and `quiz.explanation` ("해설").
   - Evidence: on the isolated build, a full-tree RSC fetch (`RSC: 1`, no state tree) contains `"answer":"정답"` and `"explanation":"해설"`, and the regex matches. The escaped initial HTML does not match.
   - Fix: drop the generic regex and assert only on question-specific secrets ("인사말", "a, e", "둘 다 정답", "buenas"), or rename the message keys (for example `answerLabel`, `explanationLabel`).

5. **D5, medium (E2E): 13.7-3 reads the URL before the navigation happens.**
   - Where: `tests/e2e/p7-board.spec.ts:70-71`: `click()` on "질문 올리기", then `publicId = page.url().split("/board/")[1]`.
   - Why: the server action only causes a soft navigation later, so `page.url()` is still `/board?c=es-conversation` and `publicId` is `undefined`.
   - Effect: 13.7-4 then looks for `[data-question="undefined"]`, and 13.7-5 inserts a comment without `post_id`. Both fail even once D1 is fixed.
   - Fix: `await expect(page.locator("h1")).toHaveText(`${TAG} 공개 질문`)` (or `page.waitForURL(/\/board\/[0-9a-f-]{36}$/)`) before reading the URL.

6. **D6, low to medium (E2E races): "admin-ok is visible" is used as the completion signal while an older banner is still on screen.**
   - `p5-quiz.spec.ts:35` with `:67-68`: `createQuiz` lands on `?msg=created`, so `addQuestion("1분 문제")` passes its check at once. `context.close()` then may abort the action, the mock quiz ends up with 0 questions, and 13.5-4 expects "0 / 1".
   - `p4-courses.spec.ts:138-142`: the unpublish click is followed at once by the student `reload()`, which can run before the update.
   - `p7-board.spec.ts:123-127`: the second `add()` is not awaited before `close()`, so `not.toContainText("비공개 성과")` in 13.7-6b can pass without that row ever existing.
   - Fix: wait for an effect specific to the action (a count increment, or `waitForURL` to a URL with a fresh `msg`) before moving on or closing the context.

7. **D7, low (E2E calendar and month edges).**
   - `p6-calls.spec.ts:141-147` picks "next month" from the UTC month. The calendar opens on the browser-local month, so the Seoul check breaks from 00:00 to 09:00 KST on the 1st, and the LA check breaks during the first UTC hours of a month.
   - Bookings set one hour ahead roll into the next Seoul month during the last hour of a month, so the credit counts are off.
   - Fix: compute months with `Intl` in each context's time zone, or click "다음 달" until `calendar-month` shows the target.

8. **D8, low (behaviour deviates from 10.3): unmatched bookings are counted as credit overruns.**
   - Where: `app/api/cal/webhook/route.ts:96-99` marks a booking with an unknown member or category as `over_limit`.
   - Effect: the dashboard card "크레딧 초과 예약" then counts bookings that are not credit overruns. The decision is recorded in `logs/build/decisions.md`.
   - Fix: count `over_limit` with `user_id is not null and category is not null` on the dashboard (the "회원 미확인" filter already exists), or use a separate flag.

9. **D9, low: a late duplicate BOOKING_CREATED revives a cancelled booking.**
   - Where: `app/api/cal/webhook/route.ts:91-99` re-checks credits when the existing row is cancelled.
   - Scenario: CREATED, then CANCELLED, then a delayed retry of CREATED. The row becomes accepted again and consumes a credit.
   - This matches the wording of trap 10. Consider keeping `cancelled` unless the event is a RESCHEDULED for a new uid.

10. **D10, low: board deletes fail silently, and authors lose their own questions when access expires.**
    - Where: `app/[locale]/board/actions.ts:48,58` ignore errors from the deletes.
    - Effect: because `can_read_post` requires `has_access`, an author whose entitlement has expired can no longer see or delete their own questions, and "내 질문" goes empty.
    - Fix: show an error, and consider `author_id = auth.uid()` as its own clause in the read policy.

11. **D11, low (copy, 16):**
    - `app/[locale]/myclass/quiz/[id]/page.tsx:45` shows "응시 횟수를 모두 사용했습니다" for any `start_attempt` error, including forbidden or expired access.
    - `app/[locale]/board/page.tsx:81` uses the post-level text "이 글을 볼 수 있는 권한이 없습니다." for a whole course tab.

12. **D12, low:** `app/auth/signout/route.ts` does not check `Origin`, so a cross-site form POST can log the user out.

13. **D13, low (test hygiene):** `tests/e2e/helpers/supa.ts:84-89` ignores `deleteUser` errors.
    - Admin test users referenced by RESTRICT FKs (`entitlements.granted_by`, `enrollment_requests.handled_by`, `attempt_answers.graded_by`) cannot be deleted while the student rows exist, so they leak.
    - Leftover rows from a crashed run, such as a basic-tier live session from 13.6-9, can break 13.6-1 (`[data-live]` count 0) on the next run.
