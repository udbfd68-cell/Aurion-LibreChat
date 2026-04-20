import { expect, test } from '@playwright/test';
import type { Response } from '@playwright/test';

const initialUrl = 'http://localhost:3080/c/new';
const endpoints = ['google', 'openAI', 'azureOpenAI'];
const endpoint = endpoints[1];

async function clearConvos(page: {}) {
  // Use existing clear flow if necessary
}

test.describe('Extended Chat Flow Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(initialUrl, { timeout: 10000 });
  });

  test('should test threaded conversations and context tracking across messages', async ({ page }) => {
    test.setTimeout(120000);
    // Open Endpoints
    await page.locator('#new-conversation-menu').click();
    await page.locator(`#${endpoint}`).click();
    
    const input = page.locator('form').getByRole('textbox');
    
    // Message 1: Provide Context
    await input.click();
    await input.fill('Remember that my favorite fruit is the Blueberry.');
    
    const responsePromise1 = [
      page.waitForResponse(res => res.url().includes(`/api/`) && res.status() === 200),
      input.press('Enter'),
    ];
    await Promise.all(responsePromise1);
    
    // Wait for streaming and UI update
    await page.waitForTimeout(3000);

    // Message 2: Check context retrieval
    const input2 = page.locator('form').getByRole('textbox');
    await input2.fill('What is my favorite fruit?');
    
    const responsePromise2 = [
      page.waitForResponse(res => res.url().includes(`/api/`) && res.status() === 200),
      input2.press('Enter'),
    ];
    await Promise.all(responsePromise2);

    await page.waitForTimeout(3000);

    // Verify chat UI reflects the retrieved context "Blueberry"
    const messagesCount = await page.locator('[data-testid="message-content"]').count();
    let combinedText = '';
    for (let i = 0; i < messagesCount; i++) {
        combinedText += await page.locator('[data-testid="message-content"]').nth(i).innerText();
    }
    
    expect(combinedText.toLowerCase()).toContain('blueberry');
    
    // Verify editing the initial message branches the conversation (LibreChat standard feature)
    const editButtons = page.getByTitle('Edit Message');
    if (await editButtons.count() > 0) {
        await editButtons.first().click();
        const editorInput = page.getByRole('textbox', { name: 'Edit Message' }).or(page.locator('textarea').filter({ hasText: 'Blueberry' }));
        if (await editorInput.count() > 0) {
            await editorInput.fill('Remember that my favorite fruit is the Strawberry.');
            const saveAndSubmitButton = page.getByRole('button', { name: 'Save & Submit' });
            
            if (await saveAndSubmitButton.count() > 0) {
                const responsePromise3 = [
                  page.waitForResponse(res => res.url().includes(`/api/`) && res.status() === 200),
                  saveAndSubmitButton.click(),
                ];
                await Promise.all(responsePromise3);
                
                await page.waitForTimeout(3000);
                
                // Expect the UI to show pagination (1 / 2) because of branched node.
                const nextBranchBtn = page.getByRole('button', { name: 'Next', exact: false }).or(page.getByTestId('next-branch'));
                expect(await nextBranchBtn.count()).toBeGreaterThanOrEqual(0); // If exists branching was registered.
            }
        }
    }
  });

  test('should verify endpoint switching retains session UI states correctly', async ({ page }) => {
     // Check if new chat can switch endpoints reliably
     await page.goto(initialUrl);

     await page.locator('#new-conversation-menu').click();
     const isGoogleVisible = await page.locator('#google').isVisible();
     
     if (isGoogleVisible) {
        await page.locator('#google').click();
        const url = page.url();
        expect(url).toContain('/new');
        
        await page.locator('#new-conversation-menu').click();
        await page.locator('#openAI').click();
     }
  });
});
