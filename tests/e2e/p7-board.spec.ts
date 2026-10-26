import { test, expect } from "@playwright/test";
import { adminDb, cleanup, configured, grant, makeUser, newUserPage, TAG, userDb, type TestUser } from "./helpers/supa";

// 13.7 P7 게시판·합격자 (실제 Supabase)
test.describe.configure({ mode: "serial" });
test.skip(!configured, "Supabase 환경변수가 없어 건너뜀");

let adminUser: TestUser;
let s1: TestUser;
let s2: TestUser;
let privateId = "";
let publicId = "";
const noticeTitle = `${TAG} 11월 일정 안내`;

test.beforeAll(async () => {
  adminUser = await makeUser("p7-admin", { role: "admin", status: "approved" });
  s1 = await makeUser("p7-s1");
  s2 = await makeUser("p7-s2");
  await grant(s1, "es-conversation", "basic");
  await grant(s2, "es-conversation", "basic");
});
test.afterAll(cleanup);

test("13.7-1 공지: 관리자 작성, 비로그인 열람, 홈 배너", async ({ browser, page }) => {
  const a = await newUserPage(browser, adminUser, "/admin/board");
  await a.page.goto("/admin/board");
  await a.page.locator('input[name="title"]').fill(noticeTitle);
  await a.page.locator('textarea[name="body"]').fill("라이브는 매주 화요일입니다.");
  await a.page.getByRole("button", { name: "공지 올리기" }).click();
  await expect(a.page.getByTestId("admin-ok")).toBeVisible();
  await a.context.close();

  await page.goto("/board");
  await expect(page.getByTestId("notice-list")).toContainText(noticeTitle);
  await page.getByRole("link", { name: noticeTitle }).click();
  await expect(page.locator("h1")).toHaveText(noticeTitle);
  await page.goto("/");
  await expect(page.locator('[data-section="notice"]')).toContainText(noticeTitle);
  const order = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(order[0]).toBe("notice");
});

test("13.7-2 권한 없는 과목 Q&A: 탭 없음, 직접 URL 권한 없음, REST 0행", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, s1, "/board");
  await page.goto("/board");
  await expect(page.locator('[data-qa-tab="es-conversation"]')).toBeVisible();
  await expect(page.locator('[data-qa-tab="topik"]')).toHaveCount(0);
  await page.goto("/board?c=topik");
  await expect(page.getByTestId("qa-no-access")).toHaveText("이 글을 볼 수 있는 권한이 없습니다.");
  await context.close();
  await adminDb().from("board_posts").insert({ kind: "question", category: "topik", author_id: adminUser.id, title: `${TAG} topik 질문`, body: "b" });
  const db = await userDb(s1);
  const { data, error } = await db.from("board_posts").select("id").eq("category", "topik");
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

test("13.7-3 비공개 질문: 작성자·관리자 외 0행", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, s1, "/board?c=es-conversation");
  await page.goto("/board?c=es-conversation");
  await page.locator("#q-title").fill(`${TAG} 비공개 질문`);
  await page.locator("#q-body").fill("성적 관련이라 비공개로 묻습니다.");
  await page.getByLabel("비공개 질문").check();
  await page.getByRole("button", { name: "질문 올리기" }).click();
  await expect(page.locator("h1")).toHaveText(`${TAG} 비공개 질문`);
  privateId = page.url().split("/board/")[1];
  await page.goto("/board?c=es-conversation");
  await page.locator("#q-title").fill(`${TAG} 공개 질문`);
  await page.locator("#q-body").fill("접속법은 언제 쓰나요?");
  await page.getByRole("button", { name: "질문 올리기" }).click();
  publicId = page.url().split("/board/")[1];
  await context.close();

  const other = await newUserPage(browser, s2, `/board/${privateId}`);
  await other.page.goto(`/board/${privateId}`);
  await expect(other.page.getByTestId("post-no-access")).toBeVisible();
  await other.page.goto("/board?c=es-conversation");
  await expect(other.page.getByTestId("question-list")).toContainText(`${TAG} 공개 질문`);
  await expect(other.page.getByTestId("question-list")).not.toContainText(`${TAG} 비공개 질문`);
  await other.context.close();
  const { data } = await (await userDb(s2)).from("board_posts").select("id").eq("id", privateId);
  expect(data).toEqual([]);
});

test("13.7-4 관리자 댓글: 강사 답변 배지, 목록 답변 완료", async ({ browser }) => {
  const a = await newUserPage(browser, adminUser, "/admin/board");
  await a.page.goto("/admin/board");
  await expect(a.page.getByRole("row").filter({ hasText: `${TAG} 비공개 질문` })).toBeVisible();
  await a.page.goto(`/board/${privateId}`);
  await a.page.locator("#c-body").fill("다음 콜에서 같이 봐요.");
  await a.page.getByRole("button", { name: "댓글 달기" }).click();
  const c = a.page.locator('[data-instructor="true"]');
  await expect(c).toContainText("강사 답변");
  await a.context.close();

  const s = await newUserPage(browser, s1, "/board?c=es-conversation");
  await s.page.goto("/board?c=es-conversation");
  await expect(s.page.locator(`[data-question="${privateId}"] [data-answered]`)).toHaveText("답변 완료");
  await expect(s.page.locator(`[data-question="${publicId}"] [data-answered]`)).toHaveText("답변 대기");
  await s.page.goto("/myclass?tab=questions");
  await expect(s.page.getByText(`${TAG} 비공개 질문`)).toBeVisible();
  await s.context.close();
});

test("13.7-5 학생이 is_instructor=true 로 댓글: 트리거가 false 로", async () => {
  const db = await userDb(s2);
  const { error } = await db.from("board_comments").insert({ post_id: publicId, author_id: s2.id, body: "위조 시도", is_instructor: true });
  expect(error).toBeNull();
  const { data } = await adminDb().from("board_comments").select("is_instructor").eq("post_id", publicId).eq("body", "위조 시도").single();
  expect(data?.is_instructor).toBe(false);
});

test("13.7-6a 합격자 입력 (관리자 화면은 플래그와 무관)", async ({ browser }) => {
  const a = await newUserPage(browser, adminUser, "/admin/showcase");
  await a.page.goto("/admin/showcase");
  await expect(a.page.getByTestId("flag-state")).toBeVisible();
  const add = async (headline: string, published: boolean) => {
    const row = a.page.locator('[data-result-row="new"]');
    await row.locator('input[name="masked_name"]').fill("김**");
    await row.locator('input[name="headline"]').fill(headline);
    if (published) await row.locator('input[name="published"]').check();
    await row.getByRole("button", { name: "합격자 추가" }).click();
    await expect(a.page.getByTestId("admin-ok")).toBeVisible();
  };
  await add(`${TAG} TOPIK 6급`, true);
  await add(`${TAG} 비공개 성과`, false);
  await a.context.close();
});

// 플래그 true 로 빌드한 서버 (scripts/test-app.sh 가 3001 에 띄움)
test("13.7-6b 플래그 true 빌드: 홈에 공개 항목만", async ({ page }) => {
  test.skip(!process.env.APP_FLAGS_URL, "플래그 빌드 서버 없음");
  await page.goto(`${process.env.APP_FLAGS_URL}/`);
  const results = page.locator('[data-section="results"]');
  await expect(results).toContainText(`${TAG} TOPIK 6급`);
  await expect(results).not.toContainText(`${TAG} 비공개 성과`);
});
