import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 60_000,
  retries: 0,
  // Stable cross-OS paths for committed top-bar PNGs under playwright/__screenshots__/
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // Avoid -darwin/-linux suffixes so one PNG set works in CI and locally.
      maxDiffPixelRatio: 0.08
    }
  },
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright/report" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "off"
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000
      }
});