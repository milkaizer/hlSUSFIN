import { test, expect, type Page } from "@playwright/test";
import { adminDb, cleanup, configured, grant, makeUser, newUserPage, submitAction, TAG, userDb, type TestUser } from "./helpers/supa";

// 13.5 P5 문제·모의고사 (실제 Supabase)
test.describe.configure({ mode: "serial" });
test.skip(!configured, "Supabase 환경변수가 없어 건너뜀");

let adminUser: TestUser;
let student: TestUser;
let practiceId = "";
let mockId = "";

async function createQuiz(page: Page, title: string, kind: "practice" | "mock", time?: number, max?: number) {
  await page.goto("/admin/quizzes");
  await page.locator('select[name="category"]').selectOption("es-conversation");
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="kind"]').selectOption(kind);
  if (time) await page.locator('input[name="time_limit_min"]').fill(String(time));
  if (max) await page.locator('input[name="max_attempts"]').fill(String(max));
  await page.locator('input[name="published"]').check();
  await page.getByRole("button", { name: "세트 만들기" }).click();
  await page.waitForURL(/\/admin\/quizzes\/[0-9a-f-]{36}\?msg=created$/);
  await expect(page.getByTestId("admin-ok")).toHaveText("추가했습니다.");
  return page.url().match(/quizzes\/([0-9a-f-]{36})/)![1];
}

async function addQuestion(page: Page, q: { type: string; prompt: string; choices?: string; answer?: string; explanation?: string; points?: number }) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "문항 추가" }) });
  await form.locator('select[name="type"]').selectOption(q.type);
  await form.locator('textarea[name="prompt"]').fill(q.prompt);
  await form.locator('textarea[name="choices"]').fill(q.choices ?? "");
  await form.locator('textarea[name="answer"]').fill(q.answer ?? "");
  await form.locator('textarea[name="explanation"]').fill(q.explanation ?? "");
  await form.locator('input[name="points"]').fill(String(q.points ?? 1));
  const quizId = page.url().match(/quizzes\/([0-9a-f-]{36})/)![1];
  const before = await questionCount(quizId);
  await submitAction(page, form.getByRole("button", { name: "문항 추가" }));
  await expect.poll(() => questionCount(quizId)).toBe(before + 1);
  await expect(page.locator("[data-question]")).toHaveCount(before + 1);
  await expect(page.getByTestId("admin-ok")).toHaveText("추가했습니다.");
}

async function questionCount(quizId: string) {
  const { count } = await adminDb().from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  return count ?? 0;
}

test.beforeAll(async () => {
  adminUser = await makeUser("p5-admin", { role: "admin", status: "approved" });
  student = await makeUser("p5-student");
  await grant(student, "es-conversation", "basic");
});
test.afterAll(cleanup);

test("관리자 문제 세트·문항 입력 (번호는 1부터)", async ({ browser }) => {
  const { context, page } = await newUserPage(browser, adminUser, "/admin/quizzes");
  practiceId = await createQuiz(page, `${TAG} 연습`, "practice");
  await addQuestion(page, { type: "mcq_single", prompt: "Hola 의 뜻은?", choices: "안녕\n고마워\n미안해", answer: "1", explanation: "인사말" });
  await addQuestion(page, { type: "mcq_multi", prompt: "모음을 모두 고르세요", choices: "a\nb\ne", answer: "1,3", explanation: "a, e" });
  await addQuestion(page, { type: "short_text", prompt: "안녕을 스페인어로", answer: "hola\nbuenas", explanation: "둘 다 정답" });
  await addQuestion(page, { type: "essay", prompt: "자기소개를 쓰세요", points: 3 });
  await expect(page.locator("[data-question]")).toHaveCount(4);
  // 잘못된 정답 번호는 거부
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "문항 추가" }) });
  await form.locator('select[name="type"]').selectOption("mcq_single");
  await form.locator('textarea[name="prompt"]').fill("x");
  await form.locator('textarea[name="choices"]').fill("a\nb");
  await form.locator('textarea[name="answer"]').fill("5");
  await form.getByRole("button", { name: "문항 추가" }).click();
  await expect(page.getByTestId("admin-error")).toContainText("정답 형식");
  // 저장은 0부터 인덱스
  const { data } = await adminDb().from("questions").select("type,answer").eq("quiz_id", practiceId).order("sort");
  expect(data?.find((q) => q.type === "mcq_single")?.answer).toBe(0);
  expect(data?.find((q) => q.type === "mcq_multi")?.answer).toEqual([0, 2]);

  mockId = await createQuiz(page, `${TAG} 모의고사`, "mock", 1, 1);
  await addQuestion(page, { type: "mcq_single", prompt: "1분 문제", choices: "A\nB", answer: "2" });
  await context.close();
});

test("13.5-6 응시 중 응답에 answer·explanation 없음 / 13.5-1·2 자동 채점 / 13.5-3 서술형", async ({ browser }) => {
  const s = await newUserPage(browser, student, `/myclass/quiz/${practiceId}`);
  const bodies: string[] = [];
  s.page.on("response", async (r) => {
    if (r.url().startsWith("http://localhost:3000")) bodies.push(await r.text().catch(() => ""));
  });
  await s.page.goto(`/myclass/quiz/${practiceId}`);
  await s.page.getByTestId("start-quiz").click();
  await expect(s.page).toHaveURL(/\/myclass\/attempt\//);
  await expect(s.page.locator("[data-qtype]")).toHaveCount(4);
  // 메시지 키 "answer"(정답 라벨)는 화면 문구라 응답에 있을 수 있으므로, 문항별 정답·해설 값이 없는지만 본다
  for (const b of bodies) {
    for (const secret of ["인사말", "둘 다 정답", "buenas", "a, e"]) expect(b).not.toContain(secret);
  }

  const q = (type: string) => s.page.locator(`[data-qtype="${type}"]`);
  await q("mcq_single").getByLabel("안녕", { exact: true }).check();
  await q("mcq_multi").getByLabel("e", { exact: true }).check();
  await q("mcq_multi").getByLabel("a", { exact: true }).check();
  await q("short_text").locator("input").fill(" HOLA ");
  await q("essay").locator("textarea").fill("Me llamo E2E.");
  await s.page.getByTestId("submit-quiz").click();
  await expect(s.page.getByTestId("result-summary")).toBeVisible();
  await expect(s.page.locator('[data-result="correct"]')).toHaveCount(3);
  await expect(s.page.getByTestId("pending-grade")).toBeVisible();
  await expect(s.page.getByTestId("score")).toHaveText("3 / 6");
  await expect(s.page.getByText("인사말")).toBeVisible();
  const attemptUrl = s.page.url();

  // 관리자 채점
  const a = await newUserPage(browser, adminUser, "/admin/grading");
  await a.page.goto("/admin/grading");
  await a.page.getByRole("row").filter({ hasText: student.email }).getByRole("link", { name: "채점하기" }).click();
  await a.page.getByLabel("점수").fill("2");
  await a.page.getByRole("button", { name: "채점 저장" }).click();
  await expect(a.page.getByTestId("admin-ok")).toHaveText("채점을 저장했습니다.");
  await expect(a.page.getByTestId("attempt-score")).toHaveText("5 / 6");
  await a.context.close();

  await s.page.goto(attemptUrl);
  await expect(s.page.getByTestId("score")).toHaveText("5 / 6");
  await expect(s.page.getByTestId("pending-grade")).toHaveCount(0);
  const { data } = await adminDb().from("attempts").select("status").eq("quiz_id", practiceId).eq("user_id", student.id).single();
  expect(data?.status).toBe("graded");
  await s.context.close();
});

test("13.5-4 1분 모의고사 방치: 0초에 자동 제출과 안내", async ({ browser }) => {
  test.setTimeout(150_000);
  const s = await newUserPage(browser, student, `/myclass/quiz/${mockId}`);
  await s.page.goto(`/myclass/quiz/${mockId}`);
  await s.page.getByTestId("start-quiz").click();
  await expect(s.page.getByTestId("time-left")).toBeVisible();
  await expect(s.page.getByTestId("auto-submitted")).toBeVisible({ timeout: 90_000 });
  await expect(s.page).toHaveURL(/\?auto=1$/);
  await expect(s.page.getByTestId("score")).toHaveText("0 / 1");
  await s.context.close();
});

test("13.5-5 응시 횟수 1회 소진: 시작 버튼 없음, RPC 도 예외", async ({ browser }) => {
  const s = await newUserPage(browser, student, `/myclass/quiz/${mockId}`);
  await s.page.goto(`/myclass/quiz/${mockId}`);
  await expect(s.page.getByTestId("start-quiz")).toHaveCount(0);
  await expect(s.page.getByTestId("no-more-attempts")).toBeVisible();
  await s.page.goto("/myclass?tab=quizzes");
  await expect(s.page.locator(`[data-quiz="${mockId}"]`).getByTestId("no-more-attempts")).toBeVisible();
  await s.context.close();
  const db = await userDb(student);
  const { error } = await db.rpc("start_attempt", { p_quiz: mockId });
  expect(error?.message).toContain("max attempts reached");
  // 정답 컬럼 직접 조회도 거부
  const { error: e2 } = await db.from("questions").select("answer").eq("quiz_id", practiceId);
  expect(e2).not.toBeNull();
});
