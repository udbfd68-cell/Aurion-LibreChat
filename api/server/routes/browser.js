/**
 * Browser automation route — exposes Playwright actions to external callers.
 * Lets the Vercel-side orchat function drive a real Chromium on Render.
 *
 * Auth: shared secret header X-Browser-Secret (BROWSER_PROXY_SECRET env).
 * Chromium path comes from CHROME_PATH (set in Dockerfile.render).
 */
const { Router } = require('express');
const { logger } = require('@librechat/data-schemas');

const router = Router();

/** @type {import('playwright-core').Browser | null} */
let browserInstance = null;

async function getBrowser() {
  const playwright = require('playwright-core');
  if (browserInstance && browserInstance.isConnected()) return browserInstance;
  const fs = require('fs');
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  let executablePath;
  for (const p of candidates) {
    try { if (fs.existsSync(p)) { executablePath = p; break; } } catch {}
  }
  browserInstance = await playwright.chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return browserInstance;
}

// POST /api/browser/run — body: { actions: [{type, ...}], timeoutMs?: number }
router.post('/run', async (req, res) => {
  const secret = req.headers['x-browser-secret'];
  if (!process.env.BROWSER_PROXY_SECRET || secret !== process.env.BROWSER_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
  const timeoutMs = Math.min(Number(req.body?.timeoutMs) || 30000, 60000);
  if (!actions.length) return res.status(400).json({ error: 'No actions provided' });

  let context;
  let page;
  const results = [];
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    });
    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    for (const a of actions) {
      if (!a || typeof a.type !== 'string') {
        results.push({ error: 'invalid action' });
        continue;
      }
      try {
        switch (a.type) {
          case 'goto':
            await page.goto(a.url, { waitUntil: a.waitUntil || 'domcontentloaded', timeout: timeoutMs });
            results.push({ type: 'goto', url: page.url(), title: await page.title() });
            break;
          case 'click':
            await page.click(a.selector, { timeout: timeoutMs });
            results.push({ type: 'click', selector: a.selector });
            break;
          case 'type':
            await page.fill(a.selector, a.text ?? '');
            results.push({ type: 'type', selector: a.selector });
            break;
          case 'press':
            await page.keyboard.press(a.key);
            results.push({ type: 'press', key: a.key });
            break;
          case 'wait':
            if (a.selector) await page.waitForSelector(a.selector, { timeout: timeoutMs });
            else await page.waitForTimeout(Math.min(Number(a.ms) || 1000, 10000));
            results.push({ type: 'wait' });
            break;
          case 'content': {
            const text = (await page.innerText('body').catch(() => '')).slice(0, 8000);
            results.push({ type: 'content', url: page.url(), title: await page.title(), text });
            break;
          }
          case 'screenshot': {
            const buf = await page.screenshot({ type: 'png', fullPage: !!a.fullPage });
            results.push({ type: 'screenshot', base64: buf.toString('base64') });
            break;
          }
          case 'snapshot': {
            // Accessibility snapshot — cheaper than full HTML
            const snap = await page.accessibility.snapshot({ interestingOnly: true });
            results.push({ type: 'snapshot', snapshot: snap, url: page.url(), title: await page.title() });
            break;
          }
          case 'eval': {
            // eslint-disable-next-line no-new-func
            const fn = new Function('return (' + a.script + ')');
            const val = await page.evaluate(fn());
            results.push({ type: 'eval', value: val });
            break;
          }
          default:
            results.push({ type: a.type, error: 'unknown action' });
        }
      } catch (err) {
        results.push({ type: a.type, error: err.message });
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    logger.error('[browser/run]', err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
});

// GET /api/browser/health
router.get('/health', async (req, res) => {
  try {
    const fs = require('fs');
    const candidates = [
      process.env.CHROME_PATH,
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/lib/chromium/chrome',
      '/usr/lib/chromium/chromium',
    ].filter(Boolean);
    const found = candidates.map(p => ({ p, exists: (() => { try { return fs.existsSync(p); } catch { return false; } })() }));
    let listBin = '';
    try { listBin = fs.readdirSync('/usr/bin').filter(f => f.toLowerCase().includes('chrom')).join(','); } catch {}
    const browser = await getBrowser();
    return res.json({ ok: true, connected: browser.isConnected(), chromePath: process.env.CHROME_PATH, candidates: found, usrBin: listBin });
  } catch (e) {
    const fs = require('fs');
    let listBin = '';
    try { listBin = fs.readdirSync('/usr/bin').filter(f => f.toLowerCase().includes('chrom')).join(','); } catch {}
    return res.status(500).json({ ok: false, error: e.message, chromePath: process.env.CHROME_PATH, usrBin: listBin });
  }
});

module.exports = router;
