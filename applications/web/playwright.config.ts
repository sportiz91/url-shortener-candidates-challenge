import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Serial on purpose: the shorten action is rate limited per client, so a
  // predictable request count keeps runs deterministic.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
