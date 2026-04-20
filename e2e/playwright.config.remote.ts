import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.E2E_REMOTE_BASE_URL ?? 'https://client-gold-zeta.vercel.app';

const config: PlaywrightTestConfig = {
  globalSetup: require.resolve('./setup/global-setup.remote'),
  globalTeardown: require.resolve('./setup/global-teardown.remote'),
  testDir: 'specs/',
  outputDir: 'specs/.test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    video: 'on-first-retry',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    headless: true,
    storageState: 'e2e/storageState.json',
    screenshot: 'only-on-failure',
  },
  expect: {
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

export default config;
