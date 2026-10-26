// 공개 페이지 390px, 1280px 전체 화면 캡처. 서버는 미리 띄워 둔다 (http://localhost:3000, 127.0.0.1 금지)
// 사용: node scripts/screens.mjs <출력 폴더> [baseURL]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
if (!out) {
  console.error("usage: node scripts/screens.mjs <out-dir> [baseURL]");
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const pages = [
  ["home", "/"],
  ["course-es-conversation", "/courses/es-conversation"],
  ["pricing", "/pricing"],
  ["home-en", "/en"],
];

const browser = await chromium.launch();
for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, locale: "ko-KR" });
  const page = await ctx.newPage();
  for (const [name, p] of pages) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const file = path.join(out, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${file} scrollWidth=${sw}`);
  }
  await ctx.close();
}
await browser.close();
