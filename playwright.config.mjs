import { defineConfig } from '@playwright/test';

const touch = { hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  reporter: [['list']],
  webServer: {
    command: 'node scripts/serve.mjs --port 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'ipad-portrait', use: { browserName: 'webkit', viewport: { width: 820, height: 1130 }, ...touch } },
    { name: 'ipad-landscape', use: { browserName: 'webkit', viewport: { width: 1180, height: 770 }, ...touch } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'narrow', use: { browserName: 'webkit', viewport: { width: 320, height: 700 }, hasTouch: true } },
  ],
});
