import { chromium, type FullConfig, type Page } from '@playwright/test';

const timeout = 15000;

const localUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPassword123!'
};

async function register(page: Page) {
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByLabel('Full name').fill(localUser.name || 'Test User');
  await page.getByLabel('Username (optional)').fill('testuser');
  await page.getByLabel('Email').fill(localUser.email);
  await page.getByTestId('password').fill(localUser.password);
  await page.getByTestId('confirm_password').fill(localUser.password);
  await page.getByLabel('Submit registration').click();
}

async function login(page: Page) {
  await page.locator('input[name="email"]').fill(localUser.email);
  await page.locator('input[name="password"]').fill(localUser.password);
  await page.locator('input[name="password"]').press('Enter');
}

export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  if (!baseURL) {
    throw new Error('Remote baseURL is not defined');
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await page.context().addInitScript(() => {
      localStorage.setItem('navVisible', 'true');
    });

    await page.goto(baseURL as string, { timeout });

    const onChatPage = page.url().includes('/c/new');
    if (!onChatPage) {
      const signUpLink = page.getByRole('link', { name: 'Sign up' });
      if (await signUpLink.isVisible().catch(() => false)) {
        await register(page);
      }

      if (!page.url().includes('/c/new')) {
        const emailInput = page.locator('input[name="email"]');
        if (await emailInput.isVisible().catch(() => false)) {
          await login(page);
        }
      }

      await page.waitForURL(/\/c\/new/, { timeout });
    }

    await page.context().storageState({ path: storageState as string });
  } finally {
    await browser.close();
  }
}
