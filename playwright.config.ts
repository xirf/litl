import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  webServer: [
    { command: 'npm run relay', port: 8787, reuseExistingServer: !process.env.CI, timeout: 10000 },
    ...(process.env.CI
      ? [
          {
            command: 'npm run start -- --host 127.0.0.1 --port 4173',
            url: 'http://127.0.0.1:4173/studio',
            reuseExistingServer: false,
            timeout: 30000,
          },
        ]
      : []),
  ],
  use: {
    baseURL: process.env.TEST_URL || 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_EXECUTABLE || (process.env.CI ? undefined : '/usr/bin/chromium'),
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
  outputDir: 'test-results',
});
