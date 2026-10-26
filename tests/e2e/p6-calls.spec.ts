import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminDb, calSig, cleanup, configured, grant, makeUser, newUserPage, RUN, sign, TAG, type TestUser } from "./helpers/supa";

// 13.6 P6 회화콜·라이브 (실제 Supabase, 웹훅은 서명 맞춘 가짜 요청)
test.describe.configure({ mode: "serial" });
test.skip(!configured || !process.env.CAL_WEBHOOK_SECRET, "Supabase 또는 CAL_WEBHOOK_SECRET 이 없어 건너뜀");

let adminUser: TestUser;
let basic: TestUser;
let standard: TestUser;

// 기본 10분 뒤: 서울 기준 같은 달 크레딧으로 계산되도록 (월말 마지막 10분에는 다음 달이 될 수 있음)
function booking(trigger: string, uid: string, user: TestUser, startsInHours = 1 / 6, extra: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + startsInHours * 3600000);
  return JSON.stringify({
    triggerEvent: trigger,
    payload: {
      uid, startTime: start.toISOString(), endTime: new Date(start.getTime() + 15 * 60000).toISOString(),
      attendees: [{ email: (extra.attendeeEmail as string | undefined) ?? user.email }],
      metadata: {
        user_id: user.id, category: "es-conversation", videoCallUrl: "https://meet.google.com/abc-defg-hij",
        sig: (extra.sig as string | undefined) ?? calSig(user.id, "es-conversation"),
      },
      ...extra,
    },
  });
}

async function post(request: APIRequestContext, body: string, signature = sign(body)) {
  return request.post("/api/cal/webhook", { data: body, headers: { "content-type": "application/json", "x-cal-signature-256": signature } });
}

async function credits(read: () => Promise<string | null>) {
  return Number(await read());
}

test.beforeAll(async () => {
  adminUser = await makeUser("p6-admin", { role: "admin", status: "approved" });
  basic = await makeUser("p6-basic");
  standard = await makeUser("p6-standard");
  await grant(basic, "es-conversation", "basic");
  await grant(standard, "es-conversation", "standard");
  const now = Date.now();
  await adminDb().from("live_sessions").insert([
    { category: "es-conversation", title: `${TAG} 20분 뒤`, starts_at: new Date(now + 20 * 60000).toISOString(), duration_min: 60, meet_url: "https://meet.google.com/aaa-bbbb-ccc", min_tier: "standard" },
    { category: "es-conversation", title: `${TAG} 3시간 뒤`, starts_at: new Date(now + 3 * 3600000).toISOString(), duration_min: 60, meet_url: "https://meet.google.com/ddd-eeee-fff", min_tier: "standard" },
  ]);
});
test.afterAll(cleanup);

test("13.6-1 basic: 회화콜 0회 안내, 라이브 목록 없음", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, basic, "/myclass?tab=calls");
  await page.goto("/myclass?tab=calls");
  await expect(page.locator('[data-call-card="es-conversation"]').getByTestId("no-credits")).toBeVisible();
  await page.goto("/myclass?tab=schedule");
  await expect(page.locator("[data-live]").filter({ hasText: TAG })).toHaveCount(0);
  await page.goto("/live");
  await expect(page.getByTestId("live-list")).toHaveCount(0);
  await context.close();
});

test("13.6-2·3·4·5 standard: 2회, 예약 링크 metadata, 웹훅 기록·재전송·취소", async ({ browser, request }) => {
  const { context, page } = await newUserPage(browser, standard, "/myclass?tab=calls");
  const card = page.locator('[data-call-card="es-conversation"]');
  const left = () => card.getByTestId("credits-left").getAttribute("data-credits");
  await page.goto("/myclass?tab=calls");
  expect(await credits(left)).toBe(2);
  const href = await card.getByTestId("book-call").getAttribute("href");
  const u = new URL(href!);
  expect(u.searchParams.get("metadata[user_id]")).toBe(standard.id);
  expect(u.searchParams.get("metadata[category]")).toBe("es-conversation");
  expect(u.searchParams.get("email")).toBe(standard.email);
  expect(u.searchParams.get("metadata[sig]")).toBe(calSig(standard.id, "es-conversation"));

  const uid = `${RUN}-b1`;
  const created = booking("BOOKING_CREATED", uid, standard);
  const r1 = await post(request, created);
  expect(r1.status()).toBe(200);
  expect((await r1.json()).status).toBe("accepted");
  await page.reload();
  expect(await credits(left)).toBe(1);
  await expect(page.getByTestId("upcoming-calls")).toContainText("Meet");

  // 같은 uid 재전송: 상태 유지, 행 1개
  const r2 = await post(request, created);
  expect((await r2.json()).status).toBe("accepted");
  const { data: rows } = await adminDb().from("call_bookings").select("status").eq("cal_uid", uid);
  expect(rows).toEqual([{ status: "accepted" }]);

  const r3 = await post(request, booking("BOOKING_CANCELLED", uid, standard));
  expect(r3.status()).toBe(200);
  await page.reload();
  expect(await credits(left)).toBe(2);
  await context.close();
});

test("13.6-6 서명 틀림: 401, 기록 없음", async ({ request }) => {
  const uid = `${RUN}-bad`;
  const body = booking("BOOKING_CREATED", uid, standard);
  expect((await post(request, body, "0".repeat(64))).status()).toBe(401);
  expect((await post(request, body, "not-hex")).status()).toBe(401);
  const { data } = await adminDb().from("call_bookings").select("id").eq("cal_uid", uid);
  expect(data).toEqual([]);
});

test("13.6-7 크레딧 0 에서 예약: over_limit, 관리자 현황 카운트 증가", async ({ browser, request }) => {
  const a = await newUserPage(browser, adminUser, "/admin");
  await a.page.goto("/admin");
  const card = a.page.locator('[data-card="확인 필요한 예약"] span').last();
  const before = Number(await card.textContent());
  expect((await (await post(request, booking("BOOKING_CREATED", `${RUN}-c1`, standard))).json()).status).toBe("accepted");
  expect((await (await post(request, booking("BOOKING_CREATED", `${RUN}-c2`, standard))).json()).status).toBe("accepted");
  const r = await post(request, booking("BOOKING_CREATED", `${RUN}-c3`, standard));
  expect((await r.json()).status).toBe("over_limit");
  await a.page.reload();
  expect(Number(await card.textContent())).toBe(before + 1);
  await a.page.goto("/admin/calls?status=over_limit");
  await expect(a.page.locator(`tr[data-booking="${RUN}-c3"]`)).toContainText("확인 필요");
  await a.context.close();

  // 재예약: 이전 예약 취소, 새 uid 기록
  const resched = booking("BOOKING_RESCHEDULED", `${RUN}-c1r`, standard, 48, { rescheduleUid: `${RUN}-c1` });
  await post(request, resched);
  const { data } = await adminDb().from("call_bookings").select("cal_uid,status").in("cal_uid", [`${RUN}-c1`, `${RUN}-c1r`]).order("cal_uid");
  expect(data).toEqual([{ cal_uid: `${RUN}-c1`, status: "cancelled" }, { cal_uid: `${RUN}-c1r`, status: "accepted" }]);
});

test("P9-2 metadata 서명이 틀리면 크레딧을 쓰지 않고 확인 필요", async ({ request }) => {
  const before = (await adminDb().rpc("call_credits_for", { p_user: standard.id, p_category: "es-conversation", p_at: new Date().toISOString() })).data;
  const r = await post(request, booking("BOOKING_CREATED", `${RUN}-spoof`, standard, 1 / 6, { sig: "0".repeat(32) }));
  expect((await r.json()).status).toBe("over_limit");
  const after = (await adminDb().rpc("call_credits_for", { p_user: standard.id, p_category: "es-conversation", p_at: new Date().toISOString() })).data;
  expect(after).toBe(before);
  // Meet 이 아닌 링크는 저장하지 않음
  const r2 = await post(request, booking("BOOKING_CREATED", `${RUN}-phish`, standard, 1 / 6, { videoCallData: { url: "https://evil.example/meet" } }));
  expect(r2.status()).toBe(200);
  const { data } = await adminDb().from("call_bookings").select("meet_url").eq("cal_uid", `${RUN}-phish`).single();
  expect(data?.meet_url).not.toBe("https://evil.example/meet");
});

test("13.6-8 라이브 링크: 3시간 전 숨김, 20분 전 입장하기", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, standard, "/myclass?tab=schedule");
  await page.goto("/myclass?tab=schedule");
  const soon = page.locator("[data-live]").filter({ hasText: `${TAG} 20분 뒤` });
  const later = page.locator("[data-live]").filter({ hasText: `${TAG} 3시간 뒤` });
  await expect(soon.getByTestId("join-live")).toHaveText("입장하기");
  await expect(soon.getByTestId("join-live")).toHaveAttribute("href", "https://meet.google.com/aaa-bbbb-ccc");
  await expect(later.getByTestId("join-live")).toHaveCount(0);
  await expect(later.getByTestId("link-soon")).toBeVisible();
  // 페이지 어디에도 3시간 뒤 링크가 없어야 함
  expect(await page.content()).not.toContain("ddd-eeee-fff");
  await page.goto("/live");
  await expect(page.getByTestId("live-list")).toContainText(`${TAG} 20분 뒤`);
  await context.close();
});

test("13.6-9 캘린더: 점 표시, 시간대에 따라 날짜·시간이 바뀜", async ({ browser }) => {
  // 서울 기준 다음 달 15일 00:30 (= UTC 전날 15:30) 라이브를 하나 넣는다
  const seoulNow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
  const [y, m] = seoulNow.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const target = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(ny, nm - 1, 15));
  const goTo = async (p: import("@playwright/test").Page) => {
    for (let i = 0; i < 3 && (await p.getByTestId("calendar-month").textContent()) !== target; i++) {
      await p.getByRole("button", { name: "다음 달" }).click();
    }
    await expect(p.getByTestId("calendar-month")).toHaveText(target);
  };
  const iso = `${ny}-${String(nm).padStart(2, "0")}-15T00:30:00+09:00`;
  await adminDb().from("live_sessions").insert({ category: "es-conversation", title: `${TAG} 자정 직후`, starts_at: iso, duration_min: 30, min_tier: "basic" });

  const seoul = await newUserPage(browser, standard, "/myclass?tab=schedule");
  await seoul.page.goto("/myclass?tab=schedule");
  await expect(seoul.page.getByTestId("calendar-month")).toBeVisible();
  await goTo(seoul.page);
  await expect(seoul.page.locator(`[data-day="${ny}-${String(nm).padStart(2, "0")}-15"] [data-dot="live"]`)).toHaveCount(1);
  const seoulText = await seoul.page.getByTestId("calendar-list").locator("li").filter({ hasText: "자정 직후" }).locator("[data-event-time]").textContent();
  await seoul.context.close();

  const la = await browser.newContext({ locale: "ko-KR", timezoneId: "America/Los_Angeles" });
  const page = await la.newPage();
  const { loginAs } = await import("./helpers/supa");
  await loginAs(page, standard, "/myclass?tab=schedule");
  await expect(page.getByTestId("calendar-month")).toBeVisible();
  await goTo(page);
  await expect(page.locator(`[data-day="${ny}-${String(nm).padStart(2, "0")}-14"] [data-dot="live"]`)).toHaveCount(1);
  const laText = await page.getByTestId("calendar-list").locator("li").filter({ hasText: "자정 직후" }).locator("[data-event-time]").textContent();
  expect(laText).not.toBe(seoulText);
  expect(laText).toContain("14");
  await la.close();
});
