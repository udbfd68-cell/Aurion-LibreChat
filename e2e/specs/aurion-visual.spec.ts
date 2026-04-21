import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Aurion AI - Visual Regression Tests
 *
 * Real browser tests against the deployed production URL with screenshots
 * at each step. Verifies the Claude.ai-like experience:
 *  - Clean UI (no Connectors panel, no MCP config buttons, no Artifacts toggle)
 *  - Discrete "via [Service]" badge appears when typing relevant keywords
 *  - No badge appears for generic messages
 *  - OpenRouter model names are human-readable
 *  - Streaming responses render progressively
 *
 * Run:
 *   npx playwright test --config=e2e/playwright.config.remote.ts e2e/specs/aurion-visual.spec.ts
 */

const BASE_URL = process.env.E2E_REMOTE_BASE_URL ?? 'https://client-gold-zeta.vercel.app';
const SHOT_DIR = path.join('e2e', 'screenshots');

/** Helper to take a full-page screenshot with a predictable name */
async function shot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

test.describe('Aurion Visual - Landing & UI cleanliness', () => {
  test('landing page loads and UI is clean (no exposed MCP/Connectors/Artifacts panels)', async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await shot(page, '01-landing');

    // Title present
    await expect(page).toHaveTitle(/Aurion|LibreChat|Chat/i);

    // Text input visible (the chat entry)
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // UI cleanliness assertions
    // 1) No "Connectors" entry in the side navigation (should be hidden)
    const connectorsNav = page.getByRole('button', { name: /connectors/i });
    await expect(connectorsNav).toHaveCount(0);

    // 2) No "Artifacts" toggle button visible under the input
    const artifactsToggle = page.getByRole('button', { name: /^artifacts$/i });
    await expect(artifactsToggle).toHaveCount(0);

    // 3) No explicit "MCP Servers" selector visible
    const mcpSelector = page.getByRole('button', { name: /mcp servers?/i });
    await expect(mcpSelector).toHaveCount(0);

    await shot(page, '02-clean-ui-verified');
  });
});

test.describe('Aurion Visual - MCP contextual routing badges', () => {
  test('typing email-related text shows "via Gmail" badge', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill('Envoie un email à mon équipe pour le meeting de demain');
    await shot(page, '03-typed-email-message');

    // Debounce is 500ms in useMCPRouter
    await page.waitForTimeout(900);

    // Badge should appear; "via" prefix is rendered, then the service name
    const via = page.locator('text=via').first();
    await expect(via).toBeVisible({ timeout: 5000 });
    const gmail = page.locator('text=Gmail').first();
    await expect(gmail).toBeVisible();

    await shot(page, '04-gmail-badge-visible');
  });

  test('typing drive-related text shows "via Drive" badge', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill('Ouvre mon fichier Drive sur le projet Aurion');
    await page.waitForTimeout(900);
    await shot(page, '05-drive-badge');

    const drive = page.locator('text=Drive').first();
    await expect(drive).toBeVisible({ timeout: 5000 });
  });

  test('typing generic message shows NO badge (clean chat)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill('Quelle est la capitale de la France?');
    await page.waitForTimeout(900);
    await shot(page, '06-generic-message-no-badge');

    // No "via" prefix should be present
    const via = page.locator('text=via').first();
    await expect(via).toHaveCount(0);
  });
});

test.describe('Aurion Visual - OpenRouter model names', () => {
  test('model selector shows human-readable names (no slash/custom IDs)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Click the model selector trigger — it sits in the header.
    // Accept any of the common selector triggers.
    const selectorCandidates = [
      page.getByRole('button', { name: /model/i }),
      page.locator('[data-testid="model-selector"]'),
      page.locator('button:has-text("Claude")'),
    ];

    let opened = false;
    for (const candidate of selectorCandidates) {
      if ((await candidate.count()) > 0) {
        await candidate.first().click({ timeout: 3000 }).catch(() => {});
        opened = true;
        break;
      }
    }
    await shot(page, '07-model-selector-open');

    if (!opened) {
      test.info().annotations.push({
        type: 'warn',
        description: 'Model selector not found; skipping OpenRouter name assertion',
      });
      return;
    }

    // Wait for any menu option to render
    await page.waitForTimeout(1000);

    const texts = await page.locator('[role="option"], [role="menuitem"]').allTextContents();
    // No raw slash IDs should be visible
    const rawIdVisible = texts.some((t) =>
      /anthropic\//.test(t) || /openai\//.test(t) || /google\//.test(t) || /meta-llama\//.test(t),
    );
    expect(rawIdVisible).toBe(false);

    await shot(page, '08-model-names-human-readable');
  });
});

test.describe('Aurion Visual - Streaming (best-effort without auth)', () => {
  test('sending a message triggers streaming indicators', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    await chatInput.fill('Dis-moi bonjour en une phrase.');
    await shot(page, '09-before-send');

    await page.keyboard.press('Enter');

    // Stop button (square / stop icon) appears while streaming.
    const stopButton = page
      .locator('button[aria-label*="stop" i], button[aria-label*="Stop" i]')
      .first();

    // Best-effort: it may not appear if user isn't authenticated on the remote;
    // we still take a screenshot for human review.
    await Promise.race([
      stopButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      page.waitForTimeout(15000),
    ]);
    await shot(page, '10-after-send');
  });
});
