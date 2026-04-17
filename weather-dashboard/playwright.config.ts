import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  workers: 1,

  // Reporter: HTML para local, list para CI
  reporter: process.env.CI ? "list" : "html",

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Levantar Next.js dev server antes de los tests (solo si no hay BASE_URL)
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3000",
        port: 3000,
        timeout: 30000,
        reuseExistingServer: !process.env.CI,
      },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
