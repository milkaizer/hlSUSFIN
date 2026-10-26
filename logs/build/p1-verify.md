# P1 independent verification

Date: 2026-10-26 (09:12 to 09:27 UTC). Verifier: separate subagent, read-only (only this file written).

Target: P1 commit `8755516`. The working tree changed while I was reviewing: the implementer committed P1/P2 at 09:14 and kept adding P3/P4 files. So I exported `8755516` to a scratch dir (node_modules symlinked) and ran tsc, eslint, `npm run build` and a flags-on build there. Runtime checks ran against those builds, and also against the repo's `.next-p1` / `.next-flags` builds; both gave the same results. HEAD (`4ad8f21`, P2) differs from P1 only in `supabase/**` and a log file.

Project script `bash scripts/test-p1.sh`: exit 0, 15/15 Playwright tests passed (tsc, eslint and both builds clean).

## Acceptance table (13.1)

| # | Item | Result | Evidence (my own commands) |
|---|---|---|---|
| 1 | `/` 200 + section order | PASS | 200; `data-section` = hero, courses, features, pricing, instructor, board, footer. No notice banner (no Supabase). With flags on: results and reviews sit between pricing and instructor, as 6.1 requires. `#courses` exists; the hero "과목 보기" link points to `#courses`. 4 tiles, 6 features, 3 tier cards. |
| 2 | `/en` English menu and hero | PASS | `html lang=en`; nav: "Courses, Live and calls, Plans, Notices and Q&A, 한국어, Log in, Apply". The only Hangul in the body is the 한국어 switcher. h1 is "¿How many sentences did you say today?" |
| 3 | 4 courses 200, unknown 404 | PASS | curl: all 4 slugs 200, `/courses/unknown` 404, `/en/courses/unknown` 404, `/fr` 404, `/en/nonexistent` 404. The 404 page renders inside the locale layout. |
| 4 | `/pricing` 3 disabled pay buttons, 3x "준비 중" | PASS | 3 `button[disabled]` "결제 준비 중", grey bg `rgba(217,221,234,.6)`, cursor not-allowed; prices = 3x "준비 중". `/en`: 3x "Coming soon". Bottom: "수강신청으로 이용하기" -> /apply, plus the note line. |
| 5 | Flags false | PASS | ko and en home: 0 results/reviews sections, 0 `href=*/reviews`, no "수강후기"/"Reviews" text in header or footer (including the hidden mobile panel). `/reviews` and `/en/reviews` return 404. |
| 6 | Flags true build | PASS | `/`: results "등록된 성과가 아직 없습니다.", reviews "등록된 후기가 아직 없습니다."; `/en` shows the English empty text; `/reviews` and `/en/reviews` 200 with empty state; reviews link in header (desktop + mobile) and footer. 0 console errors or warnings, 0 page errors. |
| 7 | Footer: no business info | PASS | Footer outerHTML and innerText on 8 pages (ko/en, flags off/on) contain no 사업자, 통신판매, 주소, 대표, 상호, business, address, and no `\d{3}-\d{2}-\d{5}` or 10-digit number. |
| 8 | `POST /api/payments/webhook` 501 | PASS | `HTTP/1.1 501`, body `{"error":"payments_not_enabled"}`. GET returns 405. |
| 9 | 390px no horizontal scroll | PASS | `scrollWidth` = 390 on 19 pages (all 4 courses, pricing, apply, login, live, board, terms, 404, and the `/en` variants) on both builds, and with the mobile menu open (ko/en). The mobile course grid has 2 columns. 1024/1100/1280 desktop header with flags on and English labels: no overflow. |
| 10 | No U+2014 in repo | PASS | `grep -rlP '\xe2\x80\x94'` (positive control hit = 1) finds 0 files in the P1 commit and 0 in the working tree (excluding node_modules, .git, .next*, local-stack/data). |
| 11 | tsc, eslint, build zero errors | PASS (P1 commit) | On the `8755516` export: `tsc --noEmit` 0, `eslint .` 0, `npm run build` exit 0, flags-on build exit 0. See the side note below about the live tree. |
| 12 | `/apply` logged out | PASS (with defect D2) | Fieldset disabled; select, 3 radios, textarea and submit are all `:disabled`. Link "로그인 후 신청할 수 있습니다" has href `/login?next=/apply` (en: `/en/login?next=/en/apply`) and navigates there. `?category=topik` preselects topik. |
| 13 | `/myclass` logged out | PASS | 307 to `/login?next=%2Fmyclass`; en goes to `/en/login?next=%2Fen%2Fmyclass`; "로그인 서버가 아직 연결되지 않았습니다" is shown. |
| 14 | Keyboard | PASS (desktop), mobile has defect D4 | Tab order: skip link, logo, 과목, 라이브·회화콜, 요금제, 공지·Q&A, English, 로그인, 수강신청. Every stop shows `solid 3px rgb(233,168,0)`. Enter opens the dropdown (`aria-expanded=true`), Tab moves into the links, Esc closes it and returns focus to the toggle; Space also opens it; tabbing out closes it; clicking outside closes it. |

Other checks

| Check | Result | Evidence |
|---|---|---|
| 9.8 security headers | PASS | `/`, the API route and the 404 all send `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; no `X-Powered-By`. |
| 2.2 versions | PASS | package.json and installed: next 15.5.28, react/react-dom 19.1.10, eslint-config-next 15.5.28, next-intl 3.26.5, @supabase/ssr 0.5.2, supabase-js 2.118.0. @playwright/test is 1.63.0 instead of 1.56.0; this is recorded in decisions.md. |
| Screenshots | PASS | `logs/build/screens/p1-{home,course-es-conversation,pricing}-{390,1280}.png`, committed in P1. I reviewed home at 390 and 1280: layout follows 7.x (left-aligned hero, ¿ ? in azafran, 6px course stripes, features as a 2-column dl, 3px ink rule over the instructor block, no shadows). |
| Copy (16, App. D) | PASS with nits | All Appendix D keys and values unchanged (checked programmatically); 44 added keys in both locales, ko/en key sets identical. No arrows on buttons, no uppercase/tracking labels, no shadows, no emoji, no system terms in messages. Meta joins use ", " (Results/ReviewsSection). |
| Supabase env absent | PASS | Every page renders logged out. `/auth/callback` without Supabase returns 307 to `/en/login?reason=failed` (locale kept). `POST /auth/signout` returns 303 to `/en` and clears `vita_sid`. `lib/supabase/admin.ts` is imported nowhere in P1. |

## Defects

D1. **Medium: switching EN to KO often bounces the user back to English.** In `components/NavBar.tsx:111,163` (switcher) together with `i18n/routing.ts` (default cookie and detection), in-flight RSC prefetches of `/en/*` links reach the middleware and come back with `Set-Cookie: NEXT_LOCALE=en`. I confirmed this with curl: an RSC prefetch of `/en/pricing` carrying `NEXT_LOCALE=ko` returns `NEXT_LOCALE=en`. If the user clicks 한국어 before those prefetches finish, the cookie ends up `en`, and the next click on an unprefixed link (`/pricing`) gets a 307 to `/en/pricing`. Repro: land on `/en/courses/topik`, click 한국어 straight away, then click 요금제. It ended on `/en/pricing` in 5 of 8 runs. This hits exactly the group that locale detection sends to `/en`: Sejong students with English browsers who want the Korean UI. Fix options: stop the middleware from writing the locale cookie on prefetch/RSC requests, turn off the locale cookie or `localeDetection`, or switch locale with a full page load after pending prefetches are aborted. Add an E2E test that clicks the switcher without waiting.

D2. **Low-Med: the disabled submit button on `/apply` looks active.** `app/globals.css` styles disabled buttons with `.btn[disabled]`, which only matches the attribute on the button itself. The button inside `<fieldset disabled>` (`app/[locale]/apply/page.tsx:61,85`) has no attribute, so it keeps the azul background `rgb(36,67,184)` and `cursor: default`, at 0.7 fieldset opacity. That contradicts 7.4 ("disabled는 회색") and misleads logged-out users. The same will happen to every fieldset-disabled form in P3+. Fix: use `.btn:disabled` (and the `-primary/-quiet` equivalents).

D3. **Low-Med (a11y, latent): form fields have no 3px focus ring.** `.field` in `app/globals.css` includes `focus:outline-none`. A focused `.field` gets `outline: 2px solid transparent`, and the only visible change is a 1px border going from line to azul. 7.2 requires a 3px azafran outline. This is copied from Appendix F. It doesn't show in P1 because every field is disabled without Supabase, but it will on `/login` and in all P3+ forms. Fix: remove `focus:outline-none` or add a `:focus-visible` outline to `.field`.

D4. **Low (a11y): Esc on the mobile menu drops focus.** `components/NavBar.tsx:51-56` returns focus to the toggle only for the desktop dropdown. With focus on a panel link (e.g. "스페인어 내신"), Esc hides the panel and `document.activeElement` becomes `<body>`. Fix: add a ref to the menu toggle and focus it when the panel closes via Esc.

D5. **Low: the mobile panel stays open after tapping the current page's link.** `NavBar.tsx:31-34` closes the panel only when `pathname` changes. On `/pricing`, tapping 요금제 in the panel leaves `aria-expanded=true` and the panel covering the page. Fix: close it in each panel link's onClick.

D6. **Low (a11y): mobile panel links have no `aria-current`.** At `NavBar.tsx:145,153`, desktop links set `aria-current="page"` but the mobile panel links don't (on `/courses/topik` the value is null).

D7. **Low (latent, P3): possible redirect loop.** `lib/auth.ts:36` `requireUser` redirects to login when `user` exists but `profile` is null, and `app/[locale]/login/page.tsx:24-25` sends any logged-in user back to `next`. The result is an endless 307 loop between `/myclass` and `/login?next=/myclass`. This happens whenever the profile read fails or returns nothing: migration not applied yet, an RLS error, a network error, or a missing row. Fix: treat "user without profile" separately (error page or sign-out) instead of sending it to login.

D8. **Low (perf): the full message catalog is serialized into every page.** `app/[locale]/layout.tsx:38` passes `messages={messages}` (all namespaces) to `NextIntlClientProvider`. Quiz, myclass and board copy ends up in the HTML of every public page (home HTML is about 58 KB). Only `nav` and `login` are used client-side. Fix: pass `pick(messages, ["nav","login"])`.

D9. **Nit: query strings are lost when switching language or going to login.** The switcher uses `usePathname()` only (`NavBar.tsx:111,163`), so `/apply?category=topik` becomes `/en/apply` and `/login?next=...` loses `next`. The `/apply` login link (`apply/page.tsx:44`) also drops `category`.

D10. **Nit (copy, added keys):** ko `myclass.applyNow` "수강신청 하기" should be "수강신청하기" (spacing). en `myclass.overLimit` "Over your monthly limit, the instructor will check" is a comma splice; suggest "Over your monthly limit. The instructor will check it."

## Test-suite leniency (implementer's specs)

- The specs don't check the visual disabled state (D2), the `.field` focus ring (D3), mobile Esc focus (D4), or the language-switch race (D1).
- `p1-public.spec.ts:97` skips every directory named `bin`, `data` or `mail` anywhere in the tree, which is broader than needed. My own grep confirms 0 hits anyway.
- 13.1-14 only checks the focus ring on the courses toggle. I checked all header tab stops: all pass.

## Side note: live working tree and `.next`

At 09:18 I ran `npm run build` in the live repo. It failed on a new, uncommitted P4 file the implementer had just written (`components/myclass/MonthCalendar.tsx:44`, `Property 'y' does not exist on type '{ y: number; m: number; } | null'`). By 09:25 `tsc --noEmit` on the live tree passed again. That failed build left `/home/user/hlSUSFIN/.next` without a `BUILD_ID`, so rebuild `.next` with the intended env before running anything from it. It also regenerated `next-env.d.ts`, which is gitignored and points at `.next/types`. `.next-p1` and `.next-flags` were not affected.
