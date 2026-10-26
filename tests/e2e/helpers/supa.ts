import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Browser, BrowserContext, Page } from "@playwright/test";

// 실제 Supabase 프로젝트로 도는 E2E 공용 도구 (P3~P7)
// 테스트 사용자는 service role 로 만들고, 매직링크 token_hash 로 /auth/callback 에 바로 들어간다 (메일 불필요)
// 이름에 RUN 접두어를 붙여 끝나면 지운다

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const configured = Boolean(url && anon && service);

export const RUN = process.env.E2E_RUN_ID ?? `r${Date.now().toString(36)}`;
export const TAG = `E2E ${RUN}`;

let _admin: SupabaseClient | null = null;
export function adminDb() {
  if (!_admin) _admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

export type TestUser = { id: string; email: string };

export async function makeUser(tag: string, opts: { role?: "admin" | "student"; status?: "pending" | "approved" | "blocked" } = {}): Promise<TestUser> {
  const email = `vita-e2e-${RUN}-${tag}@example.com`;
  const { data, error } = await adminDb().auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: `E2E ${tag}` } });
  if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`);
  if (opts.role || opts.status) {
    const { error: e2 } = await adminDb().from("profiles").update({ role: opts.role ?? "student", status: opts.status ?? "pending" }).eq("id", data.user.id);
    if (e2) throw new Error(`profile ${tag}: ${e2.message}`);
  }
  return { id: data.user.id, email };
}

async function tokenHash(email: string) {
  const { data, error } = await adminDb().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message}`);
  return data.properties.hashed_token;
}

// 브라우저에서 로그인 (콜백이 1계정 1세션 토큰을 발급)
export async function loginAs(page: Page, user: TestUser, next = "/myclass") {
  const hash = await tokenHash(user.email);
  await page.goto(`/auth/callback?token_hash=${encodeURIComponent(hash)}&type=magiclink&next=${encodeURIComponent(next)}`);
}

export async function newUserPage(browser: Browser, user: TestUser, next = "/myclass"): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  await loginAs(page, user, next);
  return { context, page };
}

// 학생 권한으로 REST 를 직접 호출하는 클라이언트 (RLS 확인용). 브라우저 세션과는 별개
export async function userDb(user: TestUser) {
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.verifyOtp({ token_hash: await tokenHash(user.email), type: "magiclink" });
  if (error) throw new Error(`verifyOtp: ${error.message}`);
  return client;
}

export async function grant(user: TestUser, category: string, tier: "basic" | "standard" | "premium", days = 30) {
  const db = adminDb();
  await db.from("profiles").update({ status: "approved" }).eq("id", user.id);
  const { error } = await db.from("entitlements").insert({
    user_id: user.id, category, tier, source: "admin", note: TAG,
    starts_at: new Date(Date.now() - 60_000).toISOString(), expires_at: new Date(Date.now() + days * 86400000).toISOString(),
  });
  if (error) throw new Error(`grant: ${error.message}`);
}

// 테스트가 만든 것 정리. 사용자 삭제는 profiles 와 연결 행까지 cascade
export async function cleanup() {
  if (!configured) return;
  const db = adminDb();
  await db.from("courses").delete().like("title", `${TAG}%`);
  await db.from("quizzes").delete().like("title", `${TAG}%`);
  await db.from("live_sessions").delete().like("title", `${TAG}%`);
  await db.from("call_bookings").delete().like("cal_uid", `${RUN}-%`);
  await db.from("results").delete().like("headline", `${TAG}%`);
  await db.from("reviews").delete().like("body", `${TAG}%`);
  const mine: { id: string; email: string }[] = [];
  for (let page = 1; page < 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    for (const u of users) if (u.email?.startsWith(`vita-e2e-${RUN}-`)) mine.push({ id: u.id, email: u.email });
    if (users.length < 200) break;
  }
  // 관리자는 다른 행(granted_by, handled_by, graded_by)이 참조하므로 학생을 먼저 지운다
  mine.sort((a, b) => Number(a.email.includes("admin")) - Number(b.email.includes("admin")));
  for (const u of mine) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) console.warn(`cleanup: ${u.email} 삭제 실패: ${error.message}`);
  }
}

// 예약 링크 metadata 서명 (lib/cal.ts 와 같은 계산. lib/cal.ts 는 server-only 라 테스트에서 import 못 함)
export function calSig(userId: string, category: string, secret = process.env.CAL_WEBHOOK_SECRET ?? "") {
  return createHmac("sha256", secret).update(`vita-booking:${userId}:${category}`).digest("hex").slice(0, 32);
}

// Cal.com 웹훅 서명 (x-cal-signature-256)
export function sign(body: string, secret = process.env.CAL_WEBHOOK_SECRET ?? "") {
  return createHmac("sha256", secret).update(body).digest("hex");
}
