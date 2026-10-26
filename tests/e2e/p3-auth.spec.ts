import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { adminDb, cleanup, configured, loginAs, makeUser, newUserPage, type TestUser } from "./helpers/supa";

// 13.3 P3 로그인·세션 (실제 Supabase)
test.describe.configure({ mode: "serial" });
test.skip(!configured, "Supabase 환경변수가 없어 건너뜀");

let student: TestUser;
let adminUser: TestUser;

test.beforeAll(async () => {
  student = await makeUser("p3-student");
  adminUser = await makeUser("p3-admin", { role: "admin", status: "approved" });
});
test.afterAll(cleanup);

test("13.3-1 신규 로그인: profiles pending, My Class 승인 대기", async ({ page }) => {
  await loginAs(page, student);
  await expect(page).toHaveURL(/\/myclass$/);
  const { data } = await adminDb().from("profiles").select("status,role").eq("id", student.id).single();
  expect(data).toEqual({ status: "pending", role: "student" });
  await expect(page.getByTestId("myclass-pending")).toContainText("승인 대기 중");
  // 세션 토큰 쿠키 발급
  const cookies = await page.context().cookies();
  const sid = cookies.find((c) => c.name === "vita_sid");
  expect(sid?.httpOnly).toBe(true);
  expect(sid?.sameSite).toBe("Lax");
});

test("13.3-2 같은 계정 두 브라우저: 첫 브라우저는 other_device 로", async ({ browser }) => {
  const a = await newUserPage(browser, student);
  await expect(a.page).toHaveURL(/\/myclass$/);
  const b = await newUserPage(browser, student);
  await expect(b.page).toHaveURL(/\/myclass$/);
  await a.page.goto("/myclass");
  await expect(a.page).toHaveURL(/\/login\?reason=other_device$/);
  await expect(a.page.getByTestId("login-reason")).toContainText("다른 기기에서 로그인되어");
  // 두 번째 브라우저는 계속 사용 가능
  await b.page.goto("/myclass");
  await expect(b.page).toHaveURL(/\/myclass$/);
  // 영어 경로도 같은 규칙
  await a.context.close();
  const c = await newUserPage(browser, student, "/en/myclass");
  await expect(c.page).toHaveURL(/\/en\/myclass$/);
  await b.page.goto("/en/myclass");
  await expect(b.page).toHaveURL(/\/en\/login\?reason=other_device$/);
  await b.context.close();
  await c.context.close();
});

test("13.3-3 학생 /admin 은 403", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, student);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(403);
  await expect(page.locator("h1")).toContainText("접근 권한이 없습니다");
  await context.close();
});

test("13.3-4 관리자 /admin 진입", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, adminUser, "/admin");
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("현황");
  await expect(page.locator('[data-card="승인 대기 회원"]')).toBeVisible();
  await context.close();
});

test("13.3-5 관리자가 승인 + es-conversation basic 부여: 학생 My Class 에 그 과목만", async ({ browser }) => {
  const admin = await newUserPage(browser, adminUser, "/admin");
  await admin.page.goto(`/admin/members?status=pending`);
  const row = admin.page.locator(`tr[data-member="${student.email}"]`);
  await row.getByRole("button", { name: "승인" }).click();
  await expect(admin.page.getByTestId("admin-ok")).toBeVisible();
  await admin.page.goto(`/admin/members/${student.id}`);
  const form = admin.page.getByTestId("grant-form");
  await form.locator('select[name="category"]').selectOption("es-conversation");
  await form.locator('select[name="tier"]').selectOption("basic");
  await form.getByRole("button", { name: "권한 부여" }).click();
  await expect(admin.page.getByTestId("admin-ok")).toHaveText("권한을 부여했습니다.");
  await expect(admin.page.locator('tr[data-ent="es-conversation"]')).toHaveCount(1);
  await admin.context.close();

  const s = await newUserPage(browser, student);
  await expect(s.page.locator("[data-course-section]")).toHaveCount(1);
  await expect(s.page.locator('[data-course-section="es-conversation"]')).toBeVisible();
  await s.context.close();
});

test("13.3-6 클라이언트 번들에 service role 키 없음", async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const dir = path.join(process.cwd(), process.env.APP_DIST ?? ".next", "static");
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else {
        const s = fs.readFileSync(f, "utf8");
        if (s.includes(key) || s.includes("SUPABASE_SERVICE_ROLE_KEY")) hits.push(f);
      }
    }
  };
  walk(dir);
  expect(hits).toEqual([]);
});

test("13.3-7 next=//evil.com 은 내부 기본 경로로", async ({ page }) => {
  // 로그인 화면이 Supabase 에 넘기는 콜백 주소 확인
  let redirectTo = "";
  await page.route("**/auth/v1/otp**", async (route) => {
    redirectTo = new URL(route.request().url()).searchParams.get("redirect_to") ?? "";
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/login?next=//evil.com");
  await page.locator("#email").fill(student.email);
  await page.getByTestId("login-email-submit").click();
  await expect(page.getByTestId("login-sent")).toBeVisible();
  expect(new URL(redirectTo).searchParams.get("next")).toBe("/myclass");

  // 콜백에 직접 넣어도 내부 경로로
  const page2 = await page.context().newPage();
  await loginAs(page2, student, "//evil.com");
  expect(new URL(page2.url()).host).toBe("localhost:3000");
  await expect(page2).toHaveURL(/\/myclass$/);
});
