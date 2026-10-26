# P8 full re-check (HANDOFF 12, 13)

Date: 2026-10-26, 10:08 to 10:35 UTC. Checker: separate subagent. I changed no source, test or doc files. This report is the only file I wrote in the repo.

Target: branch `claude/proceed-as-is-rus4o2`. Code under test is `b86c1d9`, which contains the fixes from `e3bfccd`. While I worked, the parent committed `d403b0a`, which only adds `COWORK_PROMPT.md` and `NEXT_STEPS.md` (no code).

## How I checked

- I ran `bash scripts/test-p1.sh` and then, separately, `supabase/tests/run.sh`.
- I built my own DB `vita_p8`: the auth stub without its `create role` lines, then 0001, 0002, 0003, the seed and my own fixtures. I replayed PostgREST-shaped SQL against it with `set role` plus `request.jwt.claims`. I created one temporary role, `p8_authadmin`, to test trigger firing as a non-superuser, and dropped it afterwards.
- Runtime probes with no real Supabase. The network blocks supabase.co, so I wrote a small local test-only gateway on `localhost:3898`. It covers the GoTrue `/auth/v1/user` and `logout` endpoints, plus the subset of PostgREST that the probed paths use: simple selects and filters, rpc, insert/upsert with `RETURNING 1`, patch and delete. Each request becomes SQL against `vita_p8`, run as the role in the JWT. It does not support embeds.
- I built the app into a scratch `.next-p8` with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:3898` and ran it on `localhost:3899`. The brief said to use empty Supabase env vars. I pointed at this local fake instead so that the auth, middleware and webhook paths actually run. Nothing left the machine.
- I drove the probes with curl and Playwright (playwright-core, preinstalled Chromium). P1 browser probes ran against a copy of the `.next-p1` server on `:3801`.
- None of the 13.3 to 13.7 E2E specs were run.

Cleanup:
- I dropped `vita_p8` and deleted `.next-p8`.
- The build rewrote `tsconfig.json`; I restored it with `git checkout`. I restored `next-env.d.ts` byte for byte from a copy (md5 `2ae65f6f...`).
- `test-p1.sh` overwrote the tracked `logs/build/p1-build.log` and `p1-build-flags.log`; I restored both with `git checkout`.
- I stopped my servers by PID. I did not touch the pre-existing next-server (PID 3204, port 3200).
- `git status` was clean before I wrote this file.

## 1. Command results

| Command | Result |
|---|---|
| `bash scripts/test-p1.sh` | exit 0, 1m02s. `tsc --noEmit`: 0 errors. `eslint .`: 0. Build `.next-p1`: OK. Build `.next-flags`: OK. Playwright: **17 passed, 0 failed, 0 flaky, 0 skipped** (16 in `p1`, 1 in `p1-flags`). |
| `PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash supabase/tests/run.sh` | exit 0. `rls_test.sql` **60 pass / 0 fail**. `app_test.sql` **37 / 0**. `security_test.sql` **19 / 0**. |
| `NEXT_DIST_DIR=.next-p8 next build` (pointed at the local fake) | exit 0 |

## 2. Regression check of prior findings

### P1 (logs/build/p1-verify.md)

| ID | Verdict | Evidence |
|---|---|---|
| D1 language switch bounce | FIXED | `i18n/routing.ts` sets `localeDetection: false`. The Playwright test "P1 검증 D1" passes. |
| D2 disabled button looks active | FIXED | `globals.css:31` uses `.btn:disabled`. The Playwright test "D2" passes. |
| D3 `.field` has no focus ring | FIXED | A focused `.field` computes to `solid 3px rgb(233, 168, 0)`. |
| D4 mobile Esc drops focus | FIXED | After Esc, `document.activeElement` is `menu-toggle`. |
| D5 panel stays open on current link | FIXED | `aria-expanded=false` after tapping 요금제 on `/pricing`. |
| D6 mobile links have no aria-current | FIXED | `/courses/topik` panel link has `aria-current="page"`. |
| D7 redirect loop without profile | FIXED | `lib/auth.ts:98` sends to `?reason=failed`. The login page only redirects when a profile exists. |
| D8 full catalog sent to the client | FIXED (as scoped) | `layout.tsx:45-46` sends only nav, login, myclass and quiz. |
| D9 query lost | PARTIAL | The switcher keeps the query (`/en/apply?category=topik`). The `/apply` login link is still `/login?next=/apply` and drops `category` (`apply/page.tsx:44`). |
| D10 copy | FIXED | "수강신청하기". The en `overLimit` is now two sentences. |

### P3 to P7 (logs/build/p3-p7-verify.md)

| ID | Verdict | Evidence |
|---|---|---|
| D1 Q&A insert always fails | FIXED | **Student SQL:** with an app id + `RETURNING 1`: OK. Without an id + `RETURNING id`: OK. `RETURNING *` on a private post: OK. Without RETURNING: OK. **Admin SQL:** question in topik with no entitlement + `RETURNING id`: OK; notice: OK. **Runtime (fake):** the real form posted "P8 런타임 질문", the browser landed on `/board/<uuid>`, h1 equals the title, and the row is in the DB. |
| D2 percent-encoded paths skip the one-device check | FIXED | With a mismatched or missing `vita_sid`, each path returned 307 to `/login?reason=other_device` (or `/en/login...`) and cleared the `sb-*` and `vita_sid` cookies. Paths tried: `/%6Dyclass`, `/my%63lass`, `/en/%6Dyclass`, `/%61dmin`, `/%61pply`, `/%65n/myclass`, `/%6D%79%63%6C%61%73%73`, `/myclass/%71uiz/<id>`, `/%2e/myclass`, an RSC request, and malformed `/%E0%A4%A`. `//myclass` and `/en//myclass` 308 to the canonical path; `/./myclass`, `/myclass%3F` and `/myclass%23` return 404. No protected page rendered with a bad token. |
| D3 tab open redirect | FIXED | 60+ unit inputs gave 0 off-site results. Runtime: logged-in `/login?next=` with `%2F%09%2F`, `%2F%2F`, `%2F%5C`, `%2F.%2F%2F`, `https://`, `/a/..//`, `%0D%0A` and `%E2%80%8B` (U+200B) all go to `/myclass` or an encoded internal path. `/%2509/...` becomes `/%09/evil.com`, which is a path. |
| D4 13.5-6 regex | FIXED | The spec now checks only question secrets. None of "인사말", "둘 다 정답", "buenas" or "a, e" appear in the messages or the static bundles. The live in-progress attempt HTML and RSC contain no explanation, only the label `"explanation":"해설"`. |
| D5 13.7-3 reads URL early | FIXED | `waitForURL(/\/board\/[0-9a-f-]{36}$/)` after the h1 check. |
| D6 admin-ok races | FIXED | p4, p5 and p7 now poll the DB for the effect. |
| D7 calendar/month edges | FIXED (residual 10-minute month-end window, documented in the spec comment) | The Seoul month is computed with `Intl`, and the spec clicks until `calendar-month` equals the target. Bookings start 10 minutes ahead. |
| D8 card counts non-overruns | FIXED (renamed) | The card is "확인 필요한 예약" and the badge is "확인 필요". The p6 spec uses the new label. See item 6 below for the student-side label. |
| D9 cancelled booking revived | FIXED | Runtime: CANCELLED, then a late CREATED, and a same-uid RESCHEDULED. All stay `cancelled` and credits are unchanged. |
| D10 silent deletes / author loses own question | FIXED (copy nit, item 12) | An expired author sees own posts (SQL). The 내 질문 tab works without active entitlements. Delete errors redirect with `?err=1`. |
| D11 copy | FIXED | `qaNoAccess` and `startError` are rendered (runtime). |
| D12 signout CSRF | FIXED | Runtime: Origin `evil.example` gives 403, `null` gives 403, the same origin gives 303, a missing Origin gives 303, and GET gives 405. |
| D13 cleanup leaks | FIXED | Students are deleted before admins, and failures are logged (`helpers/supa.ts:91-96`). |

### P9 (logs/build/p9-security.md)

| # | Verdict | Evidence |
|---|---|---|
| 1 notice forgery | FIXED | A student UPDATE of kind, category, author_id or created_at gives `permission denied`. An upsert `ON CONFLICT DO UPDATE SET kind` is denied. An insert with `created_at` is denied. Title, body and is_private updates still work. |
| 2 booking forgery | PARTIAL | The minimal fix works at runtime: a mismatched email gives `over_limit` with no credit used, and email-only or unknown category gives `over_limit`. The residual is item 2 below. |
| 3 answer leak | PARTIAL | Questions added later are hidden, and answers are hidden after expiry (SQL and runtime: the expired result page shows the score and no explanation). Burning one attempt still reveals the answers (item 1). `submit_attempt` still has no `has_access` recheck (item 8). |
| 4 start_attempt race | FIXED | Two concurrent transactions returned the same id. 1 row. A later start raises `max attempts reached`. |
| 5 open redirect | FIXED | See D3. |
| 6 non-Meet link | FIXED | Stored: `https://meet.google.com/abc-defg-hij` and its `?authuser=1` form. NULL: `meet.google.com.evil.com`, `evil.com/meet.google.com`, `http:`, `HTTPS:`, `#x`, `/lookup/x`, `meet.google.com@evil.com` and `javascript:`. Display also uses `isMeetUrl`. |
| 7 one-device bypass | PARTIAL (accepted by design for direct REST) | Pages and server actions are blocked. The board detail page still reads with the kicked device's JWT (item 3). |
| 8 request flood | FIXED | The unique partial index works, and the app shows `error=dup` with the ko/en message (runtime). |
| 9 long name / trigger EXECUTE | FIXED | As non-superuser `p8_authadmin` (no EXECUTE on `handle_new_user`), an `auth.users` insert still fired the trigger: the profile was pending and the name 100 chars. The comment trigger also still fires for `authenticated`. |
| 10 info | Unchanged | `profiles.email` is still not unique, but email-only matches are now `over_limit`. A signed `null` JSON body crashes (item 10). |

## 3. Section 13 re-walk

13.1: PASS 14/14 (Playwright 17/17, plus my browser probes above). 13.2: PASS (60/60, plus app 37/37 and security 19/19).

"Fake runtime" means the real app code ran against the local fake backend. Real GoTrue, PostgREST and E2E were not run.

| Row | Verdict | Evidence |
|---|---|---|
| 13.3-1 | CANNOT-RUN-WITHOUT-SUPABASE, path correct | The trigger fires for a non-superuser after the EXECUTE revoke. The callback sets `vita_sid`, which `getViewer` now requires. |
| 13.3-2 | PASS (fake runtime) | See D2. `/login?reason=other_device` shows "다른 기기에서 로그인되어...". |
| 13.3-3 | PASS (fake runtime) | Student `/admin` returns 403, and the forbidden h1 is in the RSC stream. |
| 13.3-4 | PASS (fake runtime) | Admin `/admin` returns 200 with h1 현황 and 5 cards. |
| 13.3-5 | CANNOT-RUN, SQL PASS | `app_test` covers it. The code is unchanged. |
| 13.3-6 | PASS (static) | No secret in `.next-p8/static`. `lib/supabase/admin.ts` is imported only by the webhook. |
| 13.3-7 | PASS (runtime) | See D3. |
| 13.4-1 | PASS (fake runtime) | `/apply?sent=1` and a pending row. A second submit for the same category gives `?error=dup`. |
| 13.4-2 to 13.4-7 | CANNOT-RUN, SQL PASS (rls 10.3-x, app_test) | That code is unchanged. The spec races are fixed. |
| 13.5-1 to 13.5-3 | PASS (SQL) | rls 10.4-1/2/3. With the inner join, the result page still lists all answered items (fake runtime: score, data-result, explanation). |
| 13.5-4 | CANNOT-RUN, path correct | The code is unchanged. |
| 13.5-5 | PASS (SQL + fake runtime) | The race is fixed. `no-more-attempts` shows with no start button. `err=max` and `err=start` give distinct copy. |
| 13.5-6 | PASS (fake runtime) | See D4. |
| 13.6-1, 13.6-2, 13.6-8 | PASS (SQL) | rls 10.5-x. The code is unchanged. |
| 13.6-3, 13.6-4, 13.6-5 | PASS (fake runtime) | Credits went 2 to 1 on create. A resend kept the status. Cancel restored the credit. |
| 13.6-6 | PASS (runtime) | 401 before any DB access. |
| 13.6-7 | PASS (fake runtime) | Credits 0 gives `over_limit`. The card counts it. |
| 13.6-9 | CANNOT-RUN, path correct | The spec fix is in place. |
| 13.7-1 | PASS (SQL) | Anon sees only the notice and its comments. |
| 13.7-2 | PASS (fake runtime + SQL) | `qa-no-access` text matches the spec exactly. 0 rows. |
| 13.7-3 | PASS (fake runtime + SQL) | Another student and anon get 0 rows and `post-no-access`. |
| 13.7-4, 13.7-5 | PASS (SQL) | The admin comment has `is_instructor=true`. A student's `true` is stored as false. |
| 13.7-6 | CANNOT-RUN, path correct | The code is unchanged. |

I found no 13.1 to 13.7 row or E2E selector, testid or text broken by the fixes. I grepped every literal in p3 to p7 against the code and messages.

## 4. Copy rules

- U+2014: 0 files outside node_modules, .git, .next* and test-results (positive control hit). U+2013: 0.
- Middle dot: only fixed label pairs ("회원·권한", "공지·Q&A", "외고·국제고"). No `·`-joined meta strings.
- ko/en message keys: 246/246, identical, with ICU placeholders matching. `e3bfccd` changed only formatting, plus 3 keys added in both locales (`apply.duplicate`, `board.qaNoAccess`, `myclass.startError`).

## 5. Remaining problems (most severe first)

1. **Medium (quiz integrity, P9-3 residual): burning one attempt on a multi-attempt mock reveals every answer.**
   - Where: `supabase/migrations/0003_security.sql:81-85`. `v_show` is true whenever access is valid.
   - Repro (SQL): on a mock with `max_attempts=2`, the student calls `start_attempt` and then `submit_attempt(…,'{}')`. `attempt_result` returns answer `1` and explanation `해설m2`. Attempt 2 with that answer is graded 1/1.
   - Fix: for `kind='mock'`, return answer and explanation only once no attempts remain (`count >= max_attempts`), or after the quiz closes. Keep the current behaviour for practice sets.

2. **Low-Medium (P9-2 residual): booking attribution still trusts two values the booker controls.**
   - Where: `app/api/cal/webhook/route.ts:74-80` and `lib/cal.ts:136-139`.
   - Why: a classmate's UUID is readable over REST (`board_posts.author_id` is granted to authenticated and anon), and classmates' emails are usually known.
   - Scenario: student A books with `metadata[user_id]=<B uuid>` and email `B@...`. The booking is `trusted`, `accepted`, and uses up B's credit.
   - Fix: add `metadata[sig]=HMAC(user_id|category)` in `calBookingUrl` and verify it in the webhook. Optionally drop `author_id` from the anon/authenticated column grant.

3. **Low (P9-7 residual): a kicked device can still read board posts with its old JWT.**
   - Where: `app/[locale]/board/[id]/page.tsx:20-22` and `:32-35`. Both use the Supabase client even when `getViewer()` reports `otherDevice`.
   - Repro (fake runtime): s1 with a mismatched `vita_sid` opens `/board/<own private post>`. The response is 200, h1 "priv", and the title appears in `<title>`.
   - Fix: run the token check in the middleware for every matched path when a user exists (that signs the device out everywhere), or use an anon client when `otherDevice`.

4. **Low: a reschedule cancels the previous booking based on an untrusted email match.**
   - Where: `route.ts:81-84` together with `:90-92`.
   - Repro (fake runtime): a `BOOKING_RESCHEDULED` with no `user_id` and attendee `s1@x.com`, carrying s1's `rescheduleUid`, set s1's accepted booking to `cancelled`, which refunds the credit. The new booking became `over_limit`.
   - Fix: require `trusted`, or match the previous row's `attendee_email`.
   - Also check a real Cal.com reschedule payload. If it lacks the metadata, every legitimate reschedule refunds a credit and records the new booking as `over_limit`.

5. **Low (pre-existing, not in prior reports): call credits ignore a blocked profile.**
   - Where: `0001_init.sql:504-514` (`call_credits_for` has no profile status check).
   - Repro: s3 has premium topik and is blocked. `call_credits_for` returns 4 while `has_access` is false. A blocked student's Cal bookings are therefore recorded as `accepted`, shown as 확정, instead of 확인 필요.
   - Fix: in a 0004 migration, join `profiles` with `status='approved'`.

6. **Low (copy): the student badge says "횟수 초과로 강사 확인 중" for any `over_limit` booking.**
   - Where: `messages/ko.json:234` and `en.json:234`, rendered at `myclass/page.tsx:335`.
   - That includes email-only and unknown-category bookings, which are not overruns. Repro: W4, a booking without metadata matched by email, is shown to that student as 횟수 초과.
   - Fix: use neutral copy, e.g. "강사 확인 중" / "Waiting for the instructor to confirm".

7. **Low: if CANCELLED arrives before CREATED, the cancelled booking still uses a credit.**
   - Where: `route.ts:54-58`. A cancel for an unknown uid updates 0 rows, so a later CREATED inserts the booking as `accepted`.
   - Fix: on a cancel with no existing row, insert a `cancelled` tombstone from `startTime`/`endTime`.

8. **Low (P9-3 sub-point): `submit_attempt` still has no `has_access` recheck.**
   - Where: `0001_init.sql:417-422`.
   - Repro: an expired student can submit a 40-day-old in-progress attempt and gets it scored (answers stay hidden).
   - Fix: add `has_access(quiz.category, quiz.min_tier)` in a 0004 replacement.

9. **Low: after 30 days, a single-device user is told they logged in elsewhere.**
   - Where: `lib/session.ts:3`, `middleware.ts:36`, `lib/auth.ts:82`.
   - Why: `vita_sid` has a fixed 30-day max-age while the Supabase session can outlive it. Once the cookie expires, the user sees "다른 기기에서 로그인되어..." even though they used one device.
   - Fix: refresh the cookie on each valid request (sliding expiry), or show a neutral message when the cookie is simply missing.

10. **Nit: a signed body of `null` crashes the webhook.**
    - Where: `route.ts:45-46` reads `body.triggerEvent` on null and returns 500 (TypeError in the log).
    - Fix: return 400 when `!body || typeof body !== "object"`.

11. **Low (tooling/docs): the documented manual webhook test can never use a credit.**
    - Where: `scripts/cal-webhook-test.mjs:28` defaults the attendee to `student@example.com`. Under the new trust rule, the command documented in `docs/SETUP.md:61`, `PROGRESS.md:22` and `NEXT_STEPS.md:79` (`created <user_id>`) always gives `over_limit`.
    - Fix: require `ATTENDEE_EMAIL`, or document it next to the command.

12. **Nit (copy): delete failures show the save/input error.**
    - Where: board delete failures redirect with `?err=1` (`board/actions.ts:50,61`), which shows "저장하지 못했습니다. 입력한 내용을 확인해 주세요." (`board/[id]/page.tsx:100`). Also, a delete that RLS turns into a 0-row no-op still counts as success.

13. **Nit: an expired student's old result page has an empty heading.**
    - Where: `myclass/attempt/[id]/page.tsx:28,42`. RLS hides the quiz title, so `<h1>` is empty (fake runtime).

14. **Nit: D9 residual.** The `/apply` login link drops `?category` (`apply/page.tsx:44`).

15. **Nit (hygiene): `scripts/test-p1.sh` dirties the working tree.** It rewrites the tracked `logs/build/p1-build.log` and `p1-build-flags.log` on every run.

16. **Info: spec deviations to record.**
    - 6.11 names the card "크레딧 초과 예약"; the app now says "확인 필요한 예약".
    - 10.3 calls for an email fallback with a credit check; the app now gives email-only bookings `over_limit`. A booking made from a plain Cal link without metadata never uses a credit.
    - `HANDOFF.md:638` (14.1-3) still lists only 0001 + seed. `docs/SETUP.md` and `NEXT_STEPS.md` correctly list 0002 and 0003. Without 0003, D1 and P9-1 come back.
    - An expired or blocked author can still read, comment on, and flip `is_private` on their own question (SQL).
    - `create unique index enrollment_requests_one_pending` will fail on a DB that already holds duplicate pending rows.
