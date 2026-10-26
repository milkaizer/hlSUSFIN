// docs/student-guide.html 을 A4 PDF 로 만든다 (한국어 1쪽 + 영어 1쪽). 실행: node scripts/student-guide-pdf.mjs
import { chromium } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const src = path.resolve("docs/student-guide.html");
const out = path.resolve("docs/student-guide.pdf");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href);
// 각 쪽 내용이 A4 높이를 넘지 않는지 확인 (넘치면 잘리므로 실패로 본다)
const overflow = await page.$$eval(".page", (els) => els.map((e) => e.scrollHeight - e.clientHeight));
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`pages=${overflow.length} overflow_px=${overflow.join(",")} -> ${path.relative(process.cwd(), out)}`);
if (overflow.some((x) => x > 0)) process.exit(1);
