// before/after 캡처를 나란히 붙인 비교 이미지 생성
// 사용: node scripts/compare-screens.mjs <before 폴더> <after 폴더> <출력 폴더>
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [beforeDir, afterDir, out] = process.argv.slice(2);
if (!beforeDir || !afterDir || !out) {
  console.error("usage: node scripts/compare-screens.mjs <before> <after> <out>");
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const dataUrl = (f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
const names = fs.readdirSync(afterDir).filter((f) => f.endsWith(".png") && fs.existsSync(path.join(beforeDir, f)));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
for (const name of names) {
  const width = name.includes("-390") ? 390 : 1280;
  const col = width === 390 ? 390 : 1280;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#e5e7eb;font:600 20px system-ui,sans-serif;color:#111}
    .row{display:flex;gap:24px;padding:24px;align-items:flex-start}
    .col{width:${col}px} .col p{margin:0 0 10px} img{width:${col}px;display:block;background:#fff}
  </style><div class="row">
    <div class="col"><p>before, ${name}</p><img src="${dataUrl(path.join(beforeDir, name))}"></div>
    <div class="col"><p>after, ${name}</p><img src="${dataUrl(path.join(afterDir, name))}"></div>
  </div>`;
  await page.setViewportSize({ width: col * 2 + 72, height: 800 });
  await page.setContent(html, { waitUntil: "load" });
  const file = path.join(out, `compare-${name}`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}
await browser.close();
