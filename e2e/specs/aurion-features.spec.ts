import { test, expect } from '@playwright/test';

/**
 * Aurion AI - LibreChat Claude.ai Clone
 * Comprehensive E2E Tests for all implemented features
 */

test.describe('Aurion AI - Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3080');
  });

  /**
   * Test 1: App Load
   * Verify the application loads correctly and displays the Claude.ai-like interface
   */
  test('should load the application successfully', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is set
    await expect(page).toHaveTitle(/Aurion|LibreChat/);

    // Verify the chat interface is visible
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible();

    // Verify no console errors
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for JavaScript errors
    const errors = logs.filter(log => log.toLowerCase().includes('error'));
    expect(errors).toHaveLength(0);
  });

  /**
   * Test 2: Login Flow
   * Verify user can login and access the chat interface
   */
  test('should allow user to login', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3080/login');

    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to chat
    await page.waitForURL('**/c/**');

    // Verify chat interface is visible
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible();
  });

  /**
   * Test 3: Model Display - OpenRouter Model Names
   * Verify OpenRouter model IDs are parsed to human-readable names
   */
  test('should display OpenRouter model names in human-readable format', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Open model selector
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await modelSelector.click();

    // Wait for model list to load
    await page.waitForSelector('[role="menuitem"]');

    // Verify model names are human-readable (not raw IDs like "anthropic/claude-opus-4")
    const modelItems = await page.locator('[role="menuitem"]').allTextContents();
    
    // Check that no raw model IDs are displayed
    const hasRawIds = modelItems.some(text => 
      text.includes('anthropic/') || 
      text.includes('google/') ||
      text.includes('meta-llama/')
    );
    
    expect(hasRawIds).toBe(false);

    // Verify readable names are present
    const hasReadableNames = modelItems.some(text =>
      text.includes('Claude') ||
      text.includes('Gemini') ||
      text.includes('Llama')
    );
    
    expect(hasReadableNames).toBe(true);
  });

  /**
   * Test 4: MCP Contextual Badges
   * Verify MCP badges appear when typing relevant keywords
   */
  test('should show MCP badges when typing relevant keywords', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a message with email keyword
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Send an email to john@example.com');

    // Wait for debounce (500ms)
    await page.waitForTimeout(600);

    // Verify Gmail badge appears
    const gmailBadge = page.locator('text=Gmail');
    await expect(gmailBadge).toBeVisible();
  });

  /**
   * Test 5: MCP Router - Multiple Keywords
   * Verify multiple MCP badges appear for different services
   */
  test('should show multiple MCP badges for different services', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a message with multiple service keywords
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Check my email and calendar for today');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Verify Gmail and Calendar badges appear
    const gmailBadge = page.locator('text=Gmail');
    const calendarBadge = page.locator('text=Calendar');
    
    await expect(gmailBadge).toBeVisible();
    await expect(calendarBadge).toBeVisible();
  });

  /**
   * Test 6: Artifacts Panel Hidden
   * Verify artifacts panel is hidden (Claude.ai-like experience)
   */
  test('should not display artifacts panel', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Verify artifacts panel is not visible
    const artifactsPanel = page.locator('#artifacts-panel');
    await expect(artifactsPanel).not.toBeVisible();
  });

  /**
   * Test 7: Connectors Route Hidden
   * Verify /connectors route is not accessible
   */
  test('should not allow access to connectors page', async ({ page }) => {
    // Try to navigate to connectors
    await page.goto('http://localhost:3080/connectors');

    // Should redirect to chat or show 404
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/connectors');
  });

  /**
   * Test 8: Chat Streaming
   * Verify SSE streaming works correctly
   */
  test('should stream chat responses', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a message
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Hello, can you help me?');

    // Send message
    await page.keyboard.press('Enter');

    // Verify streaming indicators (stop button appears)
    const stopButton = page.locator('button[aria-label*="stop"]');
    await expect(stopButton).toBeVisible({ timeout: 5000 });

    // Wait for response to complete
    await expect(stopButton).not.toBeVisible({ timeout: 30000 });
  });

  /**
   * Test 9: Error-Free Console
   * Verify no console errors during normal usage
   */
  test('should have no console errors during normal usage', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      logs.push(msg.text());
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Login
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Send a message
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Test message');
    await page.keyboard.press('Enter');

    // Wait for response
    await page.waitForTimeout(5000);

    // Check for errors
    expect(errors).toHaveLength(0);
  });

  /**
   * Test 10: MCP Router API
   * Verify /api/mcp/route endpoint works correctly
   */
  test('should return correct MCP servers from routing API', async ({ request }) => {
    const response = await request.post('http://localhost:3080/api/mcp/route', {
      data: {
        message: 'Send an email to my boss about the meeting'
      }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('servers');
    expect(Array.isArray(data.servers)).toBe(true);
    expect(data.servers).toContain('gmail');
  });

  /**
   * Test 11: Web Search Integration
   * Verify web search keyword triggers search badge
   */
  test('should show search badge when typing search-related keywords', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a search query
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Search for the latest news about AI');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Verify search badge appears
    const searchBadge = page.locator('text=Search');
    await expect(searchBadge).toBeVisible();
  });

  /**
   * Test 12: GitHub Integration
   * Verify GitHub keyword triggers GitHub badge
   */
  test('should show GitHub badge when typing GitHub-related keywords', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a GitHub-related message
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Check the GitHub repo for the latest commits');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Verify GitHub badge appears
    const githubBadge = page.locator('text=GitHub');
    await expect(githubBadge).toBeVisible();
  });

  /**
   * Test 13: Linear Integration
   * Verify Linear keyword triggers Linear badge
   */
  test('should show Linear badge when typing Linear-related keywords', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Type a Linear-related message
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await chatInput.fill('Create a new Linear issue for this bug');

    // Wait for debounce
    await page.waitForTimeout(600);

    // Verify Linear badge appears
    const linearBadge = page.locator('text=Linear');
    await expect(linearBadge).toBeVisible();
  });

  /**
   * Test 14: Responsive Design
   * Verify interface works on mobile viewport
   */
  test('should work correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('http://localhost:3080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/c/**');

    // Verify chat input is accessible
    const chatInput = page.locator('textarea[data-testid="text-input"]');
    await expect(chatInput).toBeVisible();

    // Type a message
    await chatInput.fill('Test on mobile');
    await page.keyboard.press('Enter');

    // Verify response
    await expect(chatInput).toBeVisible();
  });
});

test.describe('Aurion AI - API Tests', () => {
  /**
   * Test 15: MCP Router API - Empty Message
   * Verify API handles empty messages correctly
   */
  test('should return empty array for empty message', async ({ request }) => {
    const response = await request.post('http://localhost:3080/api/mcp/route', {
      data: {
        message: ''
      }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.servers).toEqual([]);
  });

  /**
   * Test 16: MCP Router API - No Keywords
   * Verify API returns empty array when no keywords match
   */
  test('should return empty array when no keywords match', async ({ request }) => {
    const response = await request.post('http://localhost:3080/api/mcp/route', {
      data: {
        message: 'This is a generic message with no service keywords'
      }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.servers).toEqual([]);
  });

  /**
   * Test 17: MCP Router API - Multiple Services
   * Verify API returns multiple services when keywords match
   */
  test('should return multiple services for matching keywords', async ({ request }) => {
    const response = await request.post('http://localhost:3080/api/mcp/route', {
      data: {
        message: 'Check email and drive files'
      }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.servers).toContain('gmail');
    expect(data.servers).toContain('google-drive');
  });
});
