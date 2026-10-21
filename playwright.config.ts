import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'child_process';

/**
 * End-to-end regression suite (see the "Tests" section of README.md).
 *
 * `npm run e2e` starts `ng serve` on a free port and runs every spec in headless Chromium at 1440x900 against the
 * built-in sample data (`src/assets/configs/config.json` must have `"env": "mock"`, the default).
 * Set E2E_BASE_URL to run against a server you already started (e.g. `E2E_BASE_URL=http://localhost:4200`).
 */

/** Asks the OS for an unused TCP port (synchronously, so the config can stay a plain object). */
function findFreePort(): number {
  const script = "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close();});";
  return Number(execFileSync(process.execPath, ['-e', script]).toString().trim());
}

// The config is evaluated again in every worker process: pick the port once in the main process and hand it to
// the workers through the environment, so they all talk to the same dev server.
if (!process.env.E2E_BASE_URL && !process.env.E2E_PORT) {
  process.env.E2E_PORT = String(findFreePort());
}
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    // The sample data is generated around "today" in the browser's time zone; the clock itself is fixed per test
    // in e2e/fixtures.ts.
    timezoneId: 'Asia/Kolkata',
    locale: 'en-US',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Full Chromium (new headless mode) rather than the default headless shell: under parallel load the headless
      // shell now and then failed to parse the 9 MB dev-server vendor.js (a random SyntaxError, the app never started)
      // although the bytes it received were intact. Not seen with full Chromium in 165 runs.
      use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx ng serve --port ${process.env.E2E_PORT} --live-reload=false --hmr=false`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: { NG_CLI_ANALYTICS: 'false' },
      },
});
