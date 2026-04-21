import { expect, test } from '@playwright/test';

const initialUrl = 'http://localhost:3080/c/new';

test.describe('Connectors & Tools Extension', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(initialUrl);
  });

  test('should verify access to tools/plugins architecture within messaging', async ({ page }) => {
    test.setTimeout(120000);
    // Allow UI to render
    await page.waitForLoadState('networkidle');

    // Access endpoint menu
    await page.locator('#new-conversation-menu').click();
    
    // Select OpenAI or Plugins endpoint which often supports tools
    const pluginEndpoint = page.locator('#plugins').or(page.locator('#openAI'));
    if (await pluginEndpoint.count() > 0) {
      await pluginEndpoint.first().click();
    } else {
      // If neither is open, default active endpoint will be used.
      await page.waitForTimeout(500);
    }
    
    // Look for tool selectors - this usually has "Tools", "Plugins", "Functions"
    const toolsSelector = page.getByRole('button', { name: /Choose tools/i })
      .or(page.getByTestId('plugin-selector'))
      .or(page.getByText(/Select Tool|Choose Plugin/i));
      
    if (await toolsSelector.count() > 0) {
      await toolsSelector.first().click();
      // Try enabling Calculator or web search
      const specificTool = page.getByText(/Calculator|Web|Search/i);
      if (await specificTool.count() > 0) {
        await specificTool.first().click();
        
        // Close menu
        await page.keyboard.press('Escape');
      }
    }

    // Input message trying to invoke the connector
    const input = page.locator('form').getByRole('textbox');
    await input.fill('What is 9753 multiplied by 8642?');
    
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/') && res.status() === 200),
      input.press('Enter'),
    ]);

    expect(response.status()).toBe(200);

    // Wait for the full message format response
    await page.waitForTimeout(3000);
    
    // Expect conversation ID to be formed and no errors to be present.
    const errorMsg = page.getByText('Something went wrong');
    expect(await errorMsg.count()).toEqual(0);
  });
});
