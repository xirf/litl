import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  webServer: { command: 'npm run relay', port: 8787, reuseExistingServer: true, timeout: 10000 },
  use: {
    baseURL: process.env.TEST_URL || 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
  outputDir: 'test-results',
});
