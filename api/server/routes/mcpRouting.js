/**
 * MCP Contextual Routing API
 *
 * POST /api/mcp/route
 *   body: { text: string }
 *   → { matches: [{ id, label, icon, priority, score, matched: [] }] }
 *
 * Called by the frontend with a 400ms debounce while the user is typing
 * so that the "via Gmail / via Drive" contextual badges can appear under
 * the composer without exposing permanent MCP panels.
 *
 * Lightweight, stateless, no DB access. Rate-limit friendly.
 */
const { Router } = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { routeText } = require('~/server/services/mcp/MCPRouter');

const router = Router();

router.post('/route', requireJwtAuth, (req, res) => {
  try {
    const text = (req.body && req.body.text) || '';
    const matches = routeText(text, { maxResults: 5 });
    res.json({ matches });
  } catch (err) {
    res.status(200).json({ matches: [], error: 'routing_failed' });
  }
});

// Public preview endpoint (no auth) — useful for the typing-hint UX before
// the user has logged in, and for integration tests. Returns the same shape.
router.post('/route/preview', (req, res) => {
  try {
    const text = (req.body && req.body.text) || '';
    const matches = routeText(text, { maxResults: 5 });
    res.json({ matches });
  } catch (err) {
    res.status(200).json({ matches: [] });
  }
});

module.exports = router;
