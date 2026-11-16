import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // CI uses the Google Chrome preinstalled on the GitHub runner, which saves
      // downloading a browser on every run.
      use: { ...devices["Desktop Chrome"], channel: process.env.CI ? "chrome" : undefined },
    },
  ],
});
