import { defineConfig } from "@playwright/test";

// E2E_SUITE
//   public: 13.1 공개 페이지 (Supabase 미연결 빌드 .next-p1 + 플래그 on 빌드 .next-flags)
//   app:    13.3~13.7 (실제 Supabase 에 연결된 빌드 .next, 플래그 on 빌드 .next-app-flags). scripts/test-app.sh
// 서버는 Playwright 가 직접 띄우고 끝나면 내린다 (함정 5). 호스트는 localhost (함정 4)
const suite = process.env.E2E_SUITE ?? "public";

const publicServers = [
  {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    env: { NEXT_DIST_DIR: process.env.P1_DIST ?? ".next-p1" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
  {
    command: "npx next start -p 3101",
    url: "http://localhost:3101",
    env: { NEXT_DIST_DIR: ".next-flags" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
];

const appServers = [
  {
    command: "npx next start -p 3000",
    url: "http://localhost:3000",
    env: { NEXT_DIST_DIR: process.env.APP_DIST ?? ".next" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
  // 13.7-6 합격자 플래그 true 빌드
  ...(process.env.APP_FLAGS_URL
    ? [{ command: "npx next start -p 3001", url: "http://localhost:3001", env: { NEXT_DIST_DIR: ".next-app-flags" }, reuseExistingServer: false, timeout: 60_000 }]
    : []),
];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { locale: "ko-KR", timezoneId: "Asia/Seoul", trace: "retain-on-failure" },
  projects:
    suite === "public"
      ? [
          { name: "p1", testMatch: /p1-public\.spec\.ts/, use: { baseURL: "http://localhost:3100" } },
          { name: "p1-flags", testMatch: /p1-flags\.spec\.ts/, use: { baseURL: "http://localhost:3101" } },
        ]
      : [{ name: "app", testMatch: /p[3-7]-.*\.spec\.ts/, use: { baseURL: "http://localhost:3000" } }],
  webServer: suite === "public" ? publicServers : appServers,
});
