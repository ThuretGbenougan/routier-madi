import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:8081",
    headless: true,
    launchOptions: {
      ...(process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"]
        ? { executablePath: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"] }
        : {}),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run desktop:dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:8081/admin/login",
    reuseExistingServer: !process.env["CI"],
  },
  reporter: "list",
});
