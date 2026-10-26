import { test, expect } from "@playwright/test";

// 13.1-6 플래그 true 빌드 (.next-flags). 데이터가 비어도 깨지지 않아야 한다
test("13.1-6 플래그 true: 빈 상태 문구, 콘솔 오류 없음", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1280, height: 900 });
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  const order = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(order).toEqual(["hero", "courses", "features", "pricing", "results", "reviews", "instructor", "board", "footer"]);
  await expect(page.getByTestId("results-empty")).toHaveText("등록된 성과가 아직 없습니다.");
  await expect(page.getByTestId("reviews-empty")).toHaveText("등록된 후기가 아직 없습니다.");
  // 데스크톱 메뉴에 보이고, 모바일 패널에도 들어 있다
  await expect(page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "수강후기" })).toBeVisible();
  await expect(page.locator('header a[href="/reviews"]')).toHaveCount(2);
  await expect(page.locator('footer a[href="/reviews"]')).toHaveCount(1);

  const r = await page.goto("/reviews");
  expect(r?.status()).toBe(200);
  await expect(page.getByTestId("reviews-empty")).toBeVisible();
  expect((await request.get("/en/reviews")).status()).toBe(200);

  await page.goto("/en");
  await expect(page.getByTestId("results-empty")).toHaveText("No results posted yet.");
  expect(errors).toEqual([]);
});
