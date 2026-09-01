import { defineConfig } from '@playwright/test'

// The workbench also runs in a plain browser against the dev server, which is
// where its look and feel can be asserted — the desktop shell has no
// WebDriver on macOS.
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: { baseURL: 'http://localhost:5180', viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
