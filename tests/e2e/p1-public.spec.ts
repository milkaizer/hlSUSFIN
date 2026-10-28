import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// 13.1 P1 공개 페이지 (Supabase 미연결, 플래그 false 빌드)
const SCREENS = path.join(process.cwd(), "logs/build/screens");
// 이 파일 자체에 문자가 들어가지 않도록 코드로 만든다
const EM_DASH = String.fromCharCode(0x2014);
const COURSES = ["es-conversation", "es-school", "ko-conversation", "topik"];

async function sections(page: Page) {
  return page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
}

test("13.1-1 홈 200, 섹션 순서", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  // 공지 배너는 공지가 없으면 렌더 안 함, 6·7 은 플래그 off
  expect(await sections(page)).toEqual(["hero", "courses", "features", "pricing", "instructor", "board", "footer"]);
  await expect(page.locator("h1")).toContainText("오늘 몇 문장을 말했나요");
});

test("13.1-2 /en 메뉴와 히어로 영어", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const res = await page.goto("/en");
  expect(res?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const nav = page.getByRole("navigation", { name: "Main menu" });
  await expect(nav.getByRole("link", { name: "Spanish", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Plans" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Notices and Q&A" })).toBeVisible();
  await expect(page.locator("h1")).toContainText("How many sentences did you say today");
});

test("13.1-3 과목 4개 200, unknown 404", async ({ page, request }) => {
  for (const slug of COURSES) {
    const res = await page.goto(`/courses/${slug}`);
    expect(res?.status(), slug).toBe(200);
    await expect(page.locator("h1")).not.toBeEmpty();
  }
  expect((await request.get("/courses/unknown")).status()).toBe(404);
  expect((await request.get("/en/courses/topik")).status()).toBe(200);
  expect((await request.get("/en/courses/unknown")).status()).toBe(404);
});

test("13.1-4 요금제: 결제 버튼 3개 disabled, 준비 중 3개", async ({ page }) => {
  await page.goto("/pricing");
  const pay = page.getByTestId("pay-button");
  await expect(pay).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(pay.nth(i)).toBeDisabled();
  const prices = page.getByTestId("price");
  await expect(prices).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(prices.nth(i)).toHaveText("준비 중");
});

test("13.1-5 플래그 false: 합격자·후기 없음, /reviews 404", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-section="results"]')).toHaveCount(0);
  await expect(page.locator('[data-section="reviews"]')).toHaveCount(0);
  await expect(page.locator('header a[href$="/reviews"], footer a[href$="/reviews"]')).toHaveCount(0);
  await expect(page.locator("header")).not.toContainText("수강후기");
  await expect(page.locator("footer")).not.toContainText("수강후기");
  expect((await request.get("/reviews")).status()).toBe(404);
  expect((await request.get("/en/reviews")).status()).toBe(404);
});

test("13.1-7 푸터에 사업자 정보 없음", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("footer").innerText();
  for (const word of ["사업자", "통신판매", "주소"]) expect(text).not.toContain(word);
  expect(text).not.toMatch(/\d{3}-\d{2}-\d{5}/);
});

test("13.1-8 결제 웹훅 501", async ({ request }) => {
  const res = await request.post("/api/payments/webhook", { data: { any: 1 } });
  expect(res.status()).toBe(501);
  expect(await res.json()).toEqual({ error: "payments_not_enabled" });
});

test("13.1-9 390px 가로 스크롤 없음", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of ["/", "/courses/es-conversation", "/pricing", "/apply", "/login", "/en", "/en/pricing"]) {
    await page.goto(p);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w, p).toBeLessThanOrEqual(390);
  }
  // 모바일 메뉴를 열어도 가로 스크롤 없음
  await page.goto("/");
  await page.getByTestId("menu-toggle").click();
  await expect(page.getByRole("link", { name: "TOPIK" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("13.1-10 저장소 전체 U+2014 0건", async () => {
  const root = process.cwd();
  const skip = new Set(["node_modules", ".git", "test-results", "playwright-report", "bin", "data", "mail"]);
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(ent.name) || ent.name.startsWith(".next")) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (!/\.(png|jpe?g|webp|ico|woff2?|tsbuildinfo)$/.test(ent.name)) {
        const s = fs.readFileSync(full, "utf8");
        if (s.includes(EM_DASH)) hits.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  expect(hits).toEqual([]);
});

test("13.1-12 /apply 비로그인: 폼 비활성, 로그인 링크", async ({ page }) => {
  await page.goto("/apply");
  await expect(page.getByTestId("apply-fieldset")).toHaveAttribute("disabled", "");
  await expect(page.locator("#category")).toBeDisabled();
  await expect(page.locator("#message")).toBeDisabled();
  await expect(page.getByRole("button", { name: "수강신청 보내기" })).toBeDisabled();
  const link = page.getByTestId("apply-login");
  await expect(link).toHaveText("로그인 후 신청할 수 있습니다");
  await expect(link).toHaveAttribute("href", "/login?next=/apply");
  // 과목 쿼리로 기본값
  await page.goto("/apply?category=topik");
  await expect(page.locator("#category")).toHaveValue("topik");
});

test("13.1-13 /myclass 비로그인은 로그인으로", async ({ page }) => {
  await page.goto("/myclass");
  await expect(page).toHaveURL(/\/login\?next=%2Fmyclass$/);
  await page.goto("/en/myclass");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fmyclass$/);
  // 로그인 서버 미연결 안내
  await expect(page.getByTestId("login-not-configured")).toBeVisible();
});

test("13.1-14 키보드: 헤더 과목 링크, 아래 방향키·Esc, 포커스 링", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const bar = page.getByTestId("desktop-nav");
  const top = bar.getByRole("link", { name: "스페인어 회화", exact: true });
  // 건너뛰기 링크, 위쪽 띠의 언어, 로고, 첫 과목 순
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 건너뛰기" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "English" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(top).toBeFocused();
  const outline = await top.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
  });
  expect(outline).toBe("solid 3px rgb(233, 168, 0)");

  // 포커스만으로는 열리지 않고, Tab 은 다음 과목으로
  await expect(top).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Tab");
  await expect(bar.getByRole("link", { name: "스페인어 내신", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");

  await page.keyboard.press("ArrowDown");
  await expect(top).toHaveAttribute("aria-expanded", "true");
  await expect(bar.getByRole("link", { name: "초급" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(bar.getByRole("link", { name: "초급" })).toBeHidden();
  await expect(top).toBeFocused();

  // Enter 는 과목 페이지로 이동
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/courses\/es-conversation$/);
});

test("P1 검증 D1: 영어에서 한국어로 바꾸면 한국어 유지", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en/pricing");
  await page.getByRole("link", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "공지·Q&A" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  // 쿼리 유지
  await page.goto("/apply?category=topik");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/apply\?category=topik$/);
});

test("P1 검증 D2: 비활성 버튼은 회색", async ({ page }) => {
  await page.goto("/apply");
  const bg = await page.getByRole("button", { name: "수강신청 보내기" }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgb(36, 67, 184)");
  const cursor = await page.getByRole("button", { name: "수강신청 보내기" }).evaluate((el) => getComputedStyle(el).cursor);
  expect(cursor).toBe("not-allowed");
});

test("보안 헤더", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("스크린샷: 홈, 과목, 요금제 390·1280", async ({ page }) => {
  fs.mkdirSync(SCREENS, { recursive: true });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [name, p] of [["home", "/"], ["course-es-conversation", "/courses/es-conversation"], ["pricing", "/pricing"]] as const) {
      await page.goto(p);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(SCREENS, `p1-${name}-${width}.png`), fullPage: true });
    }
  }
});

test("과목 메뉴: 헤더에 과목 4개, 마우스로 과목, 학교, 학년", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const bar = page.getByTestId("desktop-nav");
  // '과목' 칸 없이 과목이 헤더 맨 위에 바로 있다
  await expect(bar.getByRole("button", { name: "과목" })).toHaveCount(0);
  for (const name of ["스페인어 회화", "스페인어 내신", "한국어 회화", "TOPIK"]) {
    await expect(bar.getByRole("link", { name, exact: true })).toBeVisible();
  }
  const school = bar.getByRole("link", { name: "스페인어 내신", exact: true });
  await school.hover();
  await expect(school).toHaveAttribute("aria-expanded", "true");
  const jeju = bar.getByRole("link", { name: "제주외고" });
  await jeju.hover();
  await expect(jeju).toHaveAttribute("aria-expanded", "true");
  const grade = bar.getByRole("link", { name: "2학년" });
  await expect(grade).toBeVisible();
  const box = await grade.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
  // 다른 과목으로 옮기면 앞 과목 메뉴는 닫힌다
  await bar.getByRole("link", { name: "TOPIK", exact: true }).hover();
  await expect(bar.getByRole("link", { name: "TOPIK II" })).toBeVisible();
  await expect(grade).toBeHidden();
  await school.hover();
  await jeju.hover();
  await grade.click();
  await expect(page).toHaveURL(/\/courses\/es-school\/jeju\/grade-2$/);
  await expect(page.locator("h1")).toHaveText("스페인어 내신 · 제주외고 2학년");
  // 수강신청은 과목 단위
  await expect(page.getByRole("link", { name: "이 과목 수강신청" })).toHaveAttribute("href", "/apply?category=es-school");
});

test("과목 메뉴: 데스크톱 방향키", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const menu = page.getByTestId("desktop-nav");
  const first = menu.getByRole("link", { name: "스페인어 회화", exact: true });
  const school = menu.getByRole("link", { name: "스페인어 내신", exact: true });
  await first.focus();
  // 좌우는 과목 사이 이동 (끝에서 처음으로)
  await page.keyboard.press("ArrowLeft");
  await expect(menu.getByRole("link", { name: "TOPIK", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(school).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("link", { name: "고양외고" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const jeju = menu.getByRole("link", { name: "제주외고" });
  await expect(jeju).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(menu.getByRole("link", { name: "1학년" })).toBeFocused();
  // 왼쪽으로 나오면 학년 메뉴가 접힌다
  await page.keyboard.press("ArrowLeft");
  await expect(jeju).toBeFocused();
  await expect(jeju).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("link", { name: "2학년" })).toBeFocused();
  // Esc 는 전체를 닫고 헤더의 과목으로
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("link", { name: "고양외고" })).toBeHidden();
  await expect(school).toBeFocused();
  // 고양외고에서 왼쪽은 헤더 과목으로 나오며 닫힌다
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(school).toBeFocused();
  await expect(school).toHaveAttribute("aria-expanded", "false");
});

test("과목 메뉴: 1280px 미만은 모바일 메뉴, 1280px 은 한 줄", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("desktop-nav")).toBeHidden();
  await expect(page.getByTestId("menu-toggle")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  // 1280px 에서 한국어, 영어 모두 과목 줄과 오른쪽 버튼이 겹치지 않는다
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const p of ["/", "/en"]) {
    await page.goto(p);
    await page.evaluate(() => document.fonts.ready);
    const bar = page.getByTestId("desktop-nav");
    await expect(bar).toBeVisible();
    const gap = await bar.evaluate((ul) => (ul.nextElementSibling as HTMLElement).getBoundingClientRect().left - ul.getBoundingClientRect().right);
    expect(gap, p).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  }
});

test("과목 메뉴: 모바일 아코디언", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByTestId("menu-toggle").click();
  const acc = page.getByTestId("courses-accordion");
  await acc.getByRole("button", { name: "스페인어 내신 세부 메뉴" }).click();
  await acc.getByRole("button", { name: "제주외고 세부 메뉴" }).click();
  const grade = acc.getByRole("link", { name: "2학년" });
  await expect(grade).toBeVisible();
  expect((await grade.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await grade.click();
  await expect(page).toHaveURL(/\/courses\/es-school\/jeju\/grade-2$/);
  await expect(page.locator("h1")).toHaveText("스페인어 내신 · 제주외고 2학년");
});

test("세부 과정 200, 없는 경로 404", async ({ page, request }) => {
  for (const p of ["/courses/es-conversation/dele-b2", "/courses/es-school/goyang", "/courses/ko-conversation/advanced", "/courses/topik/topik-1"]) {
    expect((await request.get(p)).status(), p).toBe(200);
  }
  for (const p of ["/courses/es-school/jeju/grade-4", "/courses/es-school/busan", "/courses/topik/beginner",
    "/courses/es-conversation/beginner/extra", "/courses/unknown/beginner", "/en/courses/es-school/jeju/grade-9"]) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
  // 영어 페이지는 학교 전체 이름
  const res = await page.goto("/en/courses/es-school/jeju/grade-2");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Spanish for school exams · Jeju Foreign Language High School Grade 2");
});
