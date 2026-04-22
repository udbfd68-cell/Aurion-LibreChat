import { expect, test } from '@playwright/test';

/**
 * Contextual MCP routing tests.
 *
 * Verifies:
 *   - "bonjour" → no "via …" badge visible under the input
 *   - "envoie un email à mon équipe" → a Gmail badge appears
 *   - "organise une réunion demain matin" → a Calendar badge appears
 *   - Clearing the input removes any badges
 *
 * Debounce is 400ms, we wait 700ms for safety margin.
 */

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3080';
const NEW_CHAT = `${BASE}/c/new`;
const BADGE_SELECTOR = 'text=via';

async function waitForRouter(page: import('@playwright/test').Page) {
  // 400ms debounce + network time, take 800ms to be safe.
  await page.waitForTimeout(800);
}

test.describe('MCP contextual routing badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NEW_CHAT, { timeout: 15_000 });
  });

  test('greeting shows no contextual badge', async ({ page }) => {
    const input = page.getByTestId('text-input');
    await input.click();
    await input.fill('bonjour');
    await waitForRouter(page);
    // The MCPContextBadges component only renders when activeServers.length > 0,
    // so the wrapper div with the "via" hint is absent.
    await expect(page.locator(BADGE_SELECTOR)).toHaveCount(0);
  });

  test('email message surfaces Gmail badge', async ({ page }) => {
    const input = page.getByTestId('text-input');
    await input.click();
    await input.fill("Envoie un email à toute mon équipe");
    await waitForRouter(page);
    await expect(page.locator(BADGE_SELECTOR)).toBeVisible({ timeout: 2_000 });
    await expect(page.getByText('Gmail', { exact: true })).toBeVisible();
  });

  test('meeting message surfaces Calendar badge', async ({ page }) => {
    const input = page.getByTestId('text-input');
    await input.click();
    await input.fill('organise une réunion demain matin');
    await waitForRouter(page);
    await expect(page.getByText('Calendar', { exact: true })).toBeVisible({ timeout: 2_000 });
  });

  test('clearing the textarea hides the badge', async ({ page }) => {
    const input = page.getByTestId('text-input');
    await input.click();
    await input.fill("Envoie un email à Paul");
    await waitForRouter(page);
    await expect(page.locator(BADGE_SELECTOR)).toBeVisible({ timeout: 2_000 });
    await input.fill('');
    // No debounce when clearing — hook clears immediately.
    await expect(page.locator(BADGE_SELECTOR)).toHaveCount(0);
  });

  test('bilingual: English message also activates routing', async ({ page }) => {
    const input = page.getByTestId('text-input');
    await input.click();
    await input.fill('Open a pull request on the github repo');
    await waitForRouter(page);
    await expect(page.getByText('GitHub', { exact: true })).toBeVisible({ timeout: 2_000 });
  });
});
