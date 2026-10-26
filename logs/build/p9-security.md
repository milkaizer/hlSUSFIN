# P9 Adversarial Security Review, Vita Language

Read-only review. Scope: middleware, route handlers, server actions, pages, lib, and the DB schema
(`0001_init.sql` + `0002_admin_functions.sql`). Attacker profiles: (a) no account, (b) pending student,
(c) approved basic student (one category), (d) expired/former student, (e) anyone who can POST the webhooks.

Method: static reading of all in-scope files + a disposable local Postgres DB (`vita_p9`, now dropped)
loaded with the real migrations + seed + the auth stub, driven as `authenticated`/`anon`/`service_role`
with `request.jwt.claims` set exactly like `supabase/tests/rls_test.sql`. The real `next-intl@3.26.5`
middleware and a `next start` of the committed `.next-p1` build (copied to scratch, run on a loopback port,
then stopped) were used to confirm routing/redirect behavior. "Reproduced" below means I observed the
output shown. "Theoretical" means reasoned from code but not executed end-to-end.

Overall: no Critical. The service-role key is correctly server-only, PostgREST/RPC privilege boundaries
(entitlements, role/status, credits, questions.answer, live_sessions.meet_url, other users' rows,
unpublished/above-tier/other-students'-private content) all held under RLS in testing, and the payment
webhook returns 501. The real problems are a board-post UPDATE policy that lets a student publish a
site-wide notice, call-booking attribution that trusts unauthenticated booking metadata, and several
quiz-integrity / answer-retention gaps.

---

## 1. [HIGH] Any approved student can publish a site-wide "notice" (defacement + phishing to all visitors incl. anonymous)

- Object: policy `posts_update`, `supabase/migrations/0001_init.sql:658-659`. Rendering sinks:
  `lib/data/public.ts:26-36` (`getNotices`/`getLatestNotice`), `components/home/NoticeBanner.tsx`,
  `app/[locale]/board/page.tsx:25,47-58`.
- Attacker: approved student with any one category (profile c).
- Cause: `posts_update` is
  `for update using (author_id = auth.uid() or is_admin()) with check (author_id = auth.uid() or is_admin())`.
  The `WITH CHECK` constrains only `author_id`. It does **not** pin `kind`, `category`, `is_private`, or
  `created_at`. A student legitimately inserts a `kind='question'` post (allowed by `posts_insert`), then
  `UPDATE`s that same row into `kind='notice', category=null`, with an arbitrary `created_at`. Notices are
  world-readable (`grant select ... to anon`, and `can_read_post` returns true for every `kind='notice'`),
  shown in the home `NoticeBanner` (latest notice) and the `/board` notices list.
- Exploit (REST/RPC with the public anon key + the student's JWT):
  1. `POST /rest/v1/board_posts` `{category:"es-conversation",kind:"question",author_id:"<self>",title:"x",body:"x"}`
  2. `PATCH /rest/v1/board_posts?id=eq.<id>`
     `{kind:"notice",category:null,title:"[공지] 계정 재인증 필요",body:"https://evil.example 에서 다시 로그인",created_at:"2099-01-01"}`
- Reproduced (local DB, as student `…0001`): the `UPDATE` succeeded (`UPDATE 1`); reading as `anon`,
  `getLatestNotice`-style query returned the forged row as the newest notice:
  `61000000-… | [공지] 계정 재인증 필요 | author 00000000-…0001 | 2099-01-01`. Direct insert of a `notice`
  by a student is correctly rejected ("new row violates row-level security policy"), so the UPDATE path is
  the only hole, but it is enough.
- Impact: any student can post a banner message visible on the home page and board to every visitor,
  including logged-out users, with a future timestamp to keep it pinned. Natural use is a credential-phishing
  "log in again here" notice. Also allows moving one's own post into a category the student has no access to.
- Minimal fix: tighten `posts_update` so students cannot change the sensitive columns, e.g.
  `with check (is_admin() or (author_id = auth.uid() and kind = 'question'))`, and ideally forbid changing
  `category`/`created_at` for non-admins (enforce in a `BEFORE UPDATE` trigger or route all post edits through
  a SECURITY DEFINER function). Student "edit my question" should be title/body/is_private only.

## 2. [HIGH] Call-booking forgery / credit drain: webhook attributes bookings from attacker-controlled metadata and attendee email

- File: `app/api/cal/webhook/route.ts:65-105`; credit math `call_credits_for` `0001_init.sql:504-514`;
  rendering `app/[locale]/myclass/page.tsx:292-340`, `app/[locale]/admin/calls/page.tsx:44-55`.
- Attacker: any student (or outsider who can create a Cal.com booking). The signature is **not** forged , 
  the attacker makes a genuine booking through the public Cal.com link, which causes Cal.com to send a
  correctly-signed webhook. The attacker controls the booking's `metadata[user_id]`, `metadata[category]`,
  `metadata[videoCallUrl]`, and attendee email (all set via the public booking URL / form; `lib/cal.ts`
  only shows the intended values, it does not constrain what a hand-crafted booking URL carries).
- Cause: the webhook identifies the member by `metadata.user_id` with only a profile-existence check
  (`route.ts:70-74`), or falls back to the attendee email (`:75-78`). Neither is tied to the person who
  actually authenticated. If the resolved user currently has credits, the booking is stored
  `status='accepted'` (`:93-95`) and counts against that user's monthly credits (`call_credits_for`
  subtracts `accepted` bookings for the Seoul month).
- Victim UUIDs are discoverable: `board_posts.author_id` is selectable (`grant select ... to anon`,
  `0001:651`) and is returned to clients in `app/[locale]/board/page.tsx:36` and
  `app/[locale]/myclass/page.tsx:356`. So a student sees the `author_id` (= auth uid) of any classmate who
  posted a public question in a shared category; emails are even easier to guess/know.
- Reproduced (DB-level simulation of exactly what the webhook writes, as `service_role`): victim
  (`…0002`, premium) started at 3 remaining credits; inserting 3 `accepted` bookings with
  `user_id=victim, attendee_email='basic@x.com'` dropped `call_credits_for(victim)` to 0, and the victim's
  own `my_call_credits('es-conversation')` then returned `0`. I did not drive the HTTP handler end-to-end
  (that part is reasoned from `route.ts`), but the DB effect the handler produces is confirmed.
- Impact: one student can zero out another student's monthly conversation-call credits, create bookings
  attributed to a classmate, and (see #6) attach an attacker-chosen "Meet" link that the victim and admin
  see. For a former/expired student the booking is marked `over_limit` (credits 0), admin noise rather
  than drain, but still forged attribution.
- Minimal fix: only trust `metadata.user_id` when the booking's attendee email also matches that profile's
  email; drop the email-only fallback, or when they disagree store `user_id=null` (unmatched) so the admin
  must reconcile. Consider a per-category shared secret in the Cal event so arbitrary bookers can't assert
  `user_id`.

## 3. [MEDIUM] Quiz answers & explanations leak through old/stale attempts, ignoring current entitlement and tier, and expose questions added later

- Object: `attempt_result` `0001_init.sql:460-475` and `submit_attempt` `0001:417-457`.
- Attacker: expired (d) or blocked student who once had an in-progress or submitted attempt; also any
  current student after a quiz's questions/`min_tier` change.
- Cause: `submit_attempt` and `attempt_result` only check `a.user_id = auth.uid()` (`:422`, `:467`). They do
  **not** re-check `has_access`, profile status, or quiz `min_tier`, and `attempt_result` returns
  `qs.answer, qs.explanation` for **every current question of the quiz** (left-joined to the attempt), not
  just the questions that were part of the attempt. So answers to questions added after the attempt (or
  after access ended) are revealed.
- Reproduced:
  - Expired student `…0004` (`has_access` returned `f`) with a 40-day-old in-progress practice attempt:
    `quiz_questions` was correctly `forbidden`, but `submit_attempt(old_attempt,'{}')` succeeded and
    `attempt_result(old_attempt)` returned both the original question and a question added **after** expiry,
    with `answer` = `["new-secret-answer"]` and `explanation` = `new-explanation`.
  - Any student can `start_attempt` → `submit_attempt(…, '{}')` (empty) → `attempt_result` to read all
    answers+explanations, confirmed for the 2-attempt mock (burned try 1 empty, read `answer=3 / exp-mock2`,
    then aced try 2 → `graded 1/1`).
- Impact: answer/explanation secrecy is lost for anyone who ever opened an attempt, permanently, regardless
  of later tier changes, expiry, or block. Combined with #4 this breaks mock-exam integrity.
- Minimal fix: in `attempt_result` return answers only for questions that have a row in
  `attempt_answers` for that attempt (inner join, or null out `answer`/`explanation` when
  `aa.question_id is null`), and re-check `has_access(quiz.category, quiz.min_tier)` (or at least
  `profiles.status='approved'`) before returning. Same `has_access` recheck in `submit_attempt`.

## 4. [MEDIUM] `start_attempt` race defeats `max_attempts` (and one-try mock exams)

- Object: `start_attempt` `0001_init.sql:384-401`.
- Attacker: any approved student with access to a quiz.
- Cause: the "already has `max_attempts`" guard is a read (`select count(*) … if v_count >= q.max_attempts`,
  `:395-396`) with no lock on the `(user, quiz)` pair and no unique constraint on attempts. Two concurrent
  `start_attempt` calls both pass the count check and both insert.
- Reproduced: two parallel transactions calling `start_attempt` on the `max_attempts=1` mock both returned
  fresh attempt ids; `select count(*)` then showed **2** attempts for one user on a 1-try quiz.
- Impact: a student gets two (or more) attempts on a capped quiz. Chained with #3: open attempt A and B,
  submit A empty, read answers via `attempt_result(A)`, then submit B with the correct answers → full marks
  on a "single-attempt timed mock". Defeats the one place answer-secrecy matters.
- Minimal fix: serialize per user+quiz, e.g. `perform pg_advisory_xact_lock(hashtextextended(p_quiz::text, …), hashtext(auth.uid()::text))`
  at the top of `start_attempt`, or add a partial unique index limiting in-progress attempts and count under
  `for update`.

## 5. [MEDIUM] Open redirect via tab character in the login `next` parameter

- File: `lib/safe-next.ts:2-5`; used by `app/[locale]/login/page.tsx:21,25` (`redirect(next)` when already
  logged in).
- Attacker: anyone sending a logged-in student a crafted `/login?next=…` link.
- Cause: `safeNext` rejects `//`, `/\` and `\r`/`\n`, but a tab (`%09`) passes. The login page then calls
  Next's `redirect(next)` with a relative path, so the `Location` header is `/\t/evil.example/phish`. Per the
  WHATWG URL parser the browser strips the tab, turning it into the protocol-relative `//evil.example/phish`,
  which resolves to `https://evil.example/phish`.
- Reproduced: `safeNext("/\t/evil.example/phish")` returns the value unchanged, and
  `new URL(that, "https://vita.example/login").href === "https://vita.example/login"`? No, a Node http
  server emitting that `Location` sends `"/\t/evil.example/phish"`, and resolving it as a browser does yields
  `https://evil.example/phish` (confirmed via `new URL`). The `/auth/callback` path is **not** affected
  because it builds an absolute `${origin}${next}`, which keeps the host as the site.
- Impact: open redirect usable for phishing (bounce a trusted `vita` link to a look-alike login). Requires
  the victim to already be authenticated (so the `redirect(next)` branch runs).
- Minimal fix: strip/reject all C0 control characters (including tab) in `safeNext`, e.g.
  `if (/[\u0000-\u001F\u007F]/.test(next)) return fallback;`, and/or validate against an allow-list of known
  internal path prefixes.

## 6. [MEDIUM] Non-Meet "Meet" link rendered to students and admin (safeHttpsUrl too permissive on call bookings)

- File: `lib/validate.ts:14-22` (`safeHttpsUrl` accepts any `https://`) vs `:24-26` (`isMeetUrl`, unused for
  bookings); webhook stores `meet_url` via `safeHttpsUrl` only (`app/api/cal/webhook/route.ts:101`); rendered
  at `app/[locale]/myclass/page.tsx:329,337` and `app/[locale]/admin/calls/page.tsx:44`.
- Attacker: as in #2, a booker controlling `metadata.videoCallUrl` (or `videoCallData.url`).
- Cause: `call_bookings.meet_url` is validated only as "some https URL", not as a Google Meet URL. The
  stricter `isMeetUrl` is applied only to the admin live-session form (`app/[locale]/admin/actions.ts:342`).
- Impact: the victim's "회화 콜, Meet 링크" button and the admin calls page link to an attacker-chosen https
  site (phishing). `target="_blank" rel="noopener noreferrer"` is set, so no window.opener issue, but the URL
  is attacker-controlled and labeled as the meeting link.
- Minimal fix: validate booking `meet_url` with `isMeetUrl` (meet.google.com only) before storing/rendering,
  or drop links that are not meet.google.com.

## 7. [LOW] One-account-one-device is a browser-navigation deterrent only; direct API and unprotected routes bypass it

- File: `middleware.ts:10` (`PROTECTED = /^\/(en\/)?(myclass|admin|apply)(\/|$)/`), `:28`, matcher `:46`.
- The vita_sid-vs-`user_sessions.session_token` check runs only for `/myclass`, `/admin`, `/apply` browser
  requests. A second device that holds a valid Supabase session (the `sb-*` cookies / JWT, independent of
  `vita_sid`) can call PostgREST/RPC on the Supabase domain directly and read all of its entitled content
  (lessons, `quiz_questions`, `start_attempt`, board, etc.) without ever hitting the middleware. Unprotected
  app routes also bypass it: `/board` and its server actions (post/comment) are not under `PROTECTED`, so a
  bumped second device can still use the Q&A board. Reproduced indirectly: as a student over PostgREST I read
  lessons/entitlements and ran `quiz_questions` with no cookie check involved.
- Judged against the stated goal (deter casual sharing among ~10 students): acceptable. Video watching lives
  under `/myclass/lesson/*`, which **is** protected, so a casual sharer using the real UI is logged out, the
  deterrent works for the common case. The bypass requires deliberately scripting Supabase calls.
- Also note the normal "steady-state" cost: the middleware does `auth.getUser()` + a `user_sessions` select on
  every protected navigation; fine at this scale.
- Minimal hardening (optional): treat the device binding as best-effort (as the spec does), and if stronger
  binding is ever wanted, enforce it inside the RPCs (e.g. have data-returning functions check a claimed
  session token) rather than in middleware.

## 8. [LOW] Unbounded `enrollment_requests` insert (admin-view flooding)

- Object: `req_insert` policy `0001_init.sql:596-599`; action `app/[locale]/apply/actions.ts`.
- Any authenticated user (including a never-approved pending account) can insert enrollment requests with no
  rate limit. Reproduced: inserted 500 rows for one user in one statement. Each is capped to 1000 chars, so
  not a storage DoS, but it floods `/admin/requests`.
- Minimal fix: cap pending requests per user+category (partial unique index on `status='pending'`, or a count
  check in a SECURITY DEFINER insert function).

## 9. [LOW/INFO] Signup display name stored untruncated from attacker-controlled auth metadata

- Object: `handle_new_user` `0001_init.sql:273-280`.
- The trigger inserts `profiles.name` from `raw_user_meta_data->>'full_name'/'name'` with no length limit.
  `update_my_profile` truncates to 100, but the initial insert does not. Anyone signing up directly against
  the public auth API (not just via the UI, which only uses OTP/OAuth) can set an arbitrary, very long
  `full_name`. Reproduced: a 50,000-char metadata name was stored in full (`char_length = 50013`). Output is
  React-escaped everywhere it is shown (admin members list, board author), so no XSS, this is a stored-data
  hygiene / minor display issue only.
- Minimal fix: `left(…, 100)` in `handle_new_user`, same as `update_my_profile`.

## 10. [INFO] Webhook replay, duplicate emails, and misc

- `app/api/cal/webhook/route.ts`: signature is HMAC over the raw body with `timingSafeEqual` (good), 503 when
  the secret is unset (confirmed `503 not_configured`), 512 KB size cap, generic error bodies, all fine.
  There is no timestamp/nonce, so a captured signed body can be replayed, but the upsert is idempotent on
  `cal_uid` and preserves non-cancelled status (`:88-92`), and cancelled replays just re-cancel; impact is
  negligible. `profiles.email` has no unique constraint, so the attendee-email fallback (`:75-78`,
  `limit(1).maybeSingle()`) is ambiguous if two profiles share an email, another reason to prefer #2's fix.
- Payment webhook returns 501 on POST and 405 on GET (confirmed), matches spec, no finding.
- `SECURITY DEFINER` hygiene is good across the board: every definer function sets `search_path = public`,
  and the privileged ones gate on `is_admin()` / `auth.role()='service_role'` (`grant_access`,
  `approve_request`, `admin_*`, `grade_essay`). `call_credits_for` execute is correctly revoked from
  `authenticated` (confirmed "permission denied for function call_credits_for"); `my_call_credits` only reads
  the caller's own credits. `live_sessions.meet_url` is excluded from the student column grant and only
  reachable via `live_link`, which enforces `has_access` + the 30-min/duration window (confirmed: basic
  student got `null` for the standard-tier session and for the basic session outside its window, and a direct
  `select meet_url` was "permission denied").
- Config: `poweredByHeader:false`, `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy` all present
  (confirmed on responses). No `dangerouslySetInnerHTML` / `eval` anywhere. Service-role key is only in
  `lib/supabase/admin.ts` behind `import "server-only"`; no secrets found in the built client bundles
  (`.next*/static`). Video embedding is gated by `isVideoId` + provider check in `VideoPlayer`. Cross-origin
  server-action POSTs are rejected by Next's built-in origin/host check (confirmed: a forged `Origin:
  evil.example` action POST was aborted with "Invalid Server Actions request"); same-origin CSRF on server
  actions is mitigated by that check plus `SameSite=Lax` session cookies. `/auth/signout` is POST-only.
- `next-intl` routing note (not a vuln): percent-encoded protected paths like `/my%63lass` keep their encoded
  form in `nextUrl.pathname`, so the app's `PROTECTED` regex does not match them in isolation, but the
  committed build still routes them to the real page, and the page-level `requireUser`/`requireAdmin` guards
  run server-side regardless. Confirmed with `next start`: `/my%63lass`, `/%6Dyclass/lesson/<uuid>`,
  `/%61dmin` all 307-redirect to `/login` (and `/admin` would 403 via `requireAdmin`). So the middleware
  session-token check can be skipped by encoding, but **authorization is not**, it lives in the page guards
  and RLS. This only weakens the device-binding deterrent (#7), it does not expose data.

---

### Confirmed vs theoretical
- Reproduced in the local DB / running build: #1 (notice escalation + anon visibility), #3 (expired-student
  answer leak incl. later-added question; empty-submit reveal), #4 (race → 2 attempts on a 1-try quiz), #5
  (tab → off-site resolution; encoded-path routing), #8 (500-row insert), #9 (50k-char name), and the
  negative confirmations in #10 (live_link gating, column/RPC denials, cross-origin action rejection, headers,
  payment 501).
- Reasoned from code, DB side-effect simulated but not driven through the HTTP handler end-to-end: #2 and #6
  (the webhook's write was simulated as `service_role`; attacker control of booking metadata/email is a
  property of the external Cal.com flow, not executed here).

### Suggested fix priority
1. #1 `posts_update` WITH CHECK (restrict kind/category/created_at/is_private), cheap, stops site-wide
   defacement/phishing.
2. #2 webhook user attribution (require email↔user_id agreement; drop email-only fallback) and #6 (meet_url
   = Meet only).
3. #3 and #4 together restore quiz/mock integrity (`attempt_result` inner-join + `has_access` recheck;
   advisory lock in `start_attempt`).
4. #5 `safeNext` control-char filter.
5. #8/#9 server-side caps.
