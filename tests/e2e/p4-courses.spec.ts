import { test, expect, type Page } from "@playwright/test";
import { adminDb, cleanup, configured, grant, makeUser, newUserPage, TAG, type TestUser } from "./helpers/supa";

// 13.4 P4 강의·수강신청 (실제 Supabase)
test.describe.configure({ mode: "serial" });
test.skip(!configured, "Supabase 환경변수가 없어 건너뜀");

let adminUser: TestUser;
let student: TestUser; // 수강신청으로 standard
let basicStudent: TestUser; // basic
let courseId = "";
const courseTitle = `${TAG} 회화 기초`;

async function lessonIds(courseTitleText: string) {
  const { data: c } = await adminDb().from("courses").select("id").eq("title", courseTitleText).single();
  const { data } = await adminDb().from("lessons").select("id,title,min_tier").eq("course_id", c!.id).order("sort");
  return data ?? [];
}

async function lessonRow(page: Page, title: string) {
  return page.locator("[data-lesson]").filter({ hasText: title });
}

test.beforeAll(async () => {
  adminUser = await makeUser("p4-admin", { role: "admin", status: "approved" });
  student = await makeUser("p4-student", { status: "approved" });
  basicStudent = await makeUser("p4-basic");
  await grant(basicStudent, "es-conversation", "basic");
});
test.afterAll(cleanup);

test("13.4-5a 관리자 강의·레슨 생성", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, adminUser, "/admin/content");
  await page.goto("/admin/content");
  await page.locator('select[name="category"]').selectOption("es-conversation");
  await page.locator('input[name="title"]').fill(courseTitle);
  await page.locator('input[name="published"]').check();
  await page.getByRole("button", { name: "강의 만들기" }).click();
  await expect(page.getByTestId("admin-ok")).toHaveText("추가했습니다.");
  courseId = page.url().match(/content\/([0-9a-f-]{36})/)![1];

  const add = async (title: string, tier: string, video: string) => {
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "레슨 추가" }) });
    await form.locator('input[name="title"]').fill(title);
    await form.locator('select[name="min_tier"]').selectOption(tier);
    await form.locator('input[name="video"]').fill(video);
    const before = (await lessonIds(courseTitle)).length;
    await form.getByRole("button", { name: "레슨 추가" }).click();
    await expect.poll(async () => (await lessonIds(courseTitle)).length).toBe(before + 1);
  };
  await add("레슨 1 인사", "basic", "https://youtu.be/dQw4w9WgXcQ");
  await add("레슨 2 심화", "standard", "https://vimeo.com/76979871");
  await expect(page.locator("tr[data-lesson]")).toHaveCount(2);
  // 잘못된 영상 주소는 거부
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "레슨 추가" }) });
  await form.locator('input[name="title"]').fill("레슨 X");
  await form.locator('input[name="video"]').fill("https://example.com/video");
  await form.getByRole("button", { name: "레슨 추가" }).click();
  await expect(page.getByTestId("admin-error")).toContainText("영상 주소");
  await context.close();
});

test("13.4-1 수강신청 제출: pending, 관리자 목록 표시", async ({ browser }) => {
  const s = await newUserPage(browser, student, "/apply");
  await s.page.goto("/apply?category=es-conversation");
  await s.page.locator('input[name="tier"][value="standard"]').check();
  await s.page.locator("#message").fill("고2, 회화 연습 원합니다");
  await s.page.getByRole("button", { name: "수강신청 보내기" }).click();
  await expect(s.page).toHaveURL(/\/apply\?sent=1$/);
  await expect(s.page.getByRole("status")).toContainText("수강신청을 보냈습니다");
  await expect(s.page.locator('[data-status="pending"]')).toHaveText("확인 중");
  await s.context.close();

  const { data } = await adminDb().from("enrollment_requests").select("status").eq("user_id", student.id);
  expect(data).toEqual([{ status: "pending" }]);
  const a = await newUserPage(browser, adminUser, "/admin/requests");
  await a.page.goto("/admin/requests");
  await expect(a.page.locator("[data-request]").filter({ hasText: student.email })).toContainText("고2, 회화 연습 원합니다");
  await a.context.close();
});

test("13.4-2 승인: grant_access 경유, My Class 즉시 반영", async ({ browser }) => {
  const a = await newUserPage(browser, adminUser, "/admin/requests");
  await a.page.goto("/admin/requests");
  await a.page.locator("[data-request]").filter({ hasText: student.email }).getByTestId("approve").click();
  await expect(a.page.getByTestId("admin-ok")).toHaveText("승인하고 권한을 부여했습니다.");
  await a.context.close();
  const { data } = await adminDb().from("entitlements").select("tier,note,source").eq("user_id", student.id);
  expect(data).toEqual([{ tier: "standard", note: "enrollment request", source: "admin" }]);

  const s = await newUserPage(browser, student);
  const section = s.page.locator('[data-course-section="es-conversation"]');
  await expect(section).toBeVisible();
  await expect(section).toContainText(courseTitle);
  await expect(await lessonRow(s.page, "레슨 2 심화")).toHaveCount(1);
  await s.page.goto("/apply");
  await expect(s.page.locator('[data-status="approved"]')).toHaveText("승인됨");
  await s.context.close();
});

test("13.4-3·4 레슨 워터마크, 완료 토글 유지", async ({ browser }) => {
  const [l1] = await lessonIds(courseTitle);
  const s = await newUserPage(browser, student);
  await s.page.goto(`/myclass/lesson/${l1.id}`);
  await expect(s.page.getByTestId("watermark")).toHaveText(student.email);
  await expect(s.page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1);
  await s.page.getByTestId("lesson-toggle").click();
  await expect(s.page.getByTestId("lesson-done")).toBeVisible();
  await s.page.reload();
  await expect(s.page.getByTestId("lesson-done")).toBeVisible();
  await s.page.goto("/myclass");
  await expect(s.page.locator(`[data-course]`).filter({ hasText: courseTitle }).getByTestId("progress")).toHaveText("1/2 완료");
  await s.context.close();
});

test("13.4-6 min_tier standard 레슨: basic 학생 목록 미노출, 직접 URL 404", async ({ browser }) => {
  const lessons = await lessonIds(courseTitle);
  const std = lessons.find((l) => l.min_tier === "standard")!;
  const b = await newUserPage(browser, basicStudent);
  await expect(await lessonRow(b.page, "레슨 1 인사")).toHaveCount(1);
  await expect(await lessonRow(b.page, "레슨 2 심화")).toHaveCount(0);
  const res = await b.page.goto(`/myclass/lesson/${std.id}`);
  expect(res?.status()).toBe(404);
  await b.context.close();
});

test("13.4-5b 수정·비공개 전환이 학생 화면에 반영", async ({ browser }) => {
  const a = await newUserPage(browser, adminUser, `/admin/content/${courseId}`);
  await a.page.goto(`/admin/content/${courseId}`);
  const row = a.page.locator("tr[data-lesson]").first();
  await row.locator('input[name="title"]').fill("레슨 1 인사 (수정)");
  await row.getByRole("button", { name: "저장" }).click();
  await expect.poll(async () => (await lessonIds(courseTitle)).some((l) => l.title === "레슨 1 인사 (수정)")).toBe(true);

  const s = await newUserPage(browser, student);
  await expect(await lessonRow(s.page, "레슨 1 인사 (수정)")).toHaveCount(1);

  const courseForm = a.page.locator("form").filter({ has: a.page.getByRole("button", { name: "강의 저장" }) });
  await courseForm.locator('input[name="published"]').uncheck();
  await a.page.getByRole("button", { name: "강의 저장" }).click();
  await expect.poll(async () => (await adminDb().from("courses").select("published").eq("id", courseId).single()).data?.published).toBe(false);
  await s.page.reload();
  await expect(s.page.locator('[data-course-section="es-conversation"]')).not.toContainText(courseTitle);
  const [l1] = await lessonIds(courseTitle);
  expect((await s.page.goto(`/myclass/lesson/${l1.id}`))?.status()).toBe(404);

  // 다시 공개
  await courseForm.locator('input[name="published"]').check();
  await a.page.getByRole("button", { name: "강의 저장" }).click();
  await expect.poll(async () => (await adminDb().from("courses").select("published").eq("id", courseId).single()).data?.published).toBe(true);
  await a.context.close();
  await s.context.close();
});

test("13.4-7 만료된 권한: My Class 에서 사라지고 레슨 404", async ({ browser }) => {
  const [l1] = await lessonIds(courseTitle);
  await adminDb().from("entitlements").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("user_id", basicStudent.id);
  const b = await newUserPage(browser, basicStudent);
  await expect(b.page.locator("[data-course-section]")).toHaveCount(0);
  await expect(b.page.getByTestId("no-courses")).toBeVisible();
  expect((await b.page.goto(`/myclass/lesson/${l1.id}`))?.status()).toBe(404);
  await b.context.close();
});
