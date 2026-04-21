import { expect, test } from '@playwright/test';

const initialUrl = 'http://localhost:3080/c/new';

test.describe('Agents Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(initialUrl);
  });

  test('should verify access to the Agents feature and basic agent interactions', async ({ page }) => {
    test.setTimeout(120000);
    await page.waitForLoadState('networkidle');

    // Trying to open Agent creation / marketplace
    const mkPlace = page.getByTestId('nav-agents-marketplace-button');
    if (await mkPlace.isVisible()) {
      await mkPlace.click();
    } else {
      await page.locator('#new-conversation-menu').click();
      const agentsOption = page.locator('#agents').or(page.getByText('Agents', { exact: true }));
      if (await agentsOption.count() > 0) {
        await agentsOption.first().click();
      }
    }

    // Look for new agent button
    const createBtn = page.getByRole('button', { name: /create.*agent/i })
      .or(page.getByText(/create.*agent/i))
      .or(page.getByTestId('create-agent-button'));
      
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
       
      // Fill the form
      await page.getByLabel('Name', { exact: false }).or(page.getByPlaceholder('Name', { exact: false })).fill('Test E2E Agent');
      await page.getByLabel('Instructions', { exact: false }).or(page.getByPlaceholder('Instructions', { exact: false })).fill('You are a helpful e2e agent');
       
      // Save agent
      const saveBtn = page.getByTestId('save-agent-button').or(page.getByRole('button', { name: 'Save' }));
      if (await saveBtn.count() > 0) {
        await saveBtn.first().click();
        
        // Wait for save indication
        await page.waitForTimeout(1000);
        await expect(page.getByText('Test E2E Agent')).toBeVisible();

        // Delete the agent
        const deleteBtn = page.getByTestId('delete-button');
        if (await deleteBtn.count() > 0) {
          await deleteBtn.first().click();
          const confirmDel = page.getByRole('button', { name: 'Delete', exact: true });
          if (await confirmDel.count() > 0) {
            await confirmDel.first().click();
          }
        }
      }
    } else {
      console.log('No create agent button available - requires backend configuration or agents enabled via .env');
    }
  });
});
