/**
 * MCPRouter — Server-side contextual routing engine.
 *
 * Given an arbitrary piece of text (a user message), decides which MCP
 * servers should be activated. Used in two places:
 *   1. HTTP endpoint `/api/mcp/route` — called by the frontend with debounce
 *      while the user is typing, to show silent "via Gmail" / "via Drive"
 *      badges under the input.
 *   2. Server-side LLM tool injection — the chat handler calls `routeTools`
 *      before dispatching the prompt to the model, and merges the detected
 *      MCP tool servers into the request's available tools.
 *
 * Extensible: rules live in ./mcp-routing-rules.js.
 */

const { MCP_ROUTING_RULES, normalize } = require('./mcp-routing-rules');

/**
 * @typedef {Object} RoutingMatch
 * @property {string} id         - MCP server id
 * @property {string} label      - Display label
 * @property {string} icon       - Icon hint
 * @property {number} score      - Sum of matched keyword weights (longer = heavier)
 * @property {number} priority   - Rule priority
 * @property {string[]} matched  - The keywords that actually matched
 */

/**
 * Analyze text and return detected MCP servers sorted by priority/score.
 * Applies a sensible minimum-length threshold to avoid false positives.
 *
 * @param {string} text
 * @param {{minLength?: number, maxResults?: number}} [opts]
 * @returns {RoutingMatch[]}
 */
function routeText(text, opts = {}) {
  const minLength = opts.minLength ?? 3;
  const maxResults = opts.maxResults ?? 5;

  if (!text || typeof text !== 'string') return [];
  const cleaned = text.trim();
  if (cleaned.length < minLength) return [];

  const haystack = normalize(cleaned);
  const matches = [];

  for (const rule of MCP_ROUTING_RULES) {
    const matched = [];
    let score = 0;
    for (const kw of rule.keywords) {
      const needle = normalize(kw);
      if (!needle) continue;
      if (haystack.includes(needle)) {
        matched.push(kw);
        // Longer keywords are more specific -> higher weight.
        score += Math.max(1, needle.length / 4);
      }
    }
    if (matched.length > 0) {
      matches.push({
        id: rule.id,
        label: rule.label,
        icon: rule.icon,
        priority: rule.priority ?? 10,
        score,
        matched,
      });
    }
  }

  // Sort: priority desc, then score desc.
  matches.sort((a, b) => (b.priority - a.priority) || (b.score - a.score));
  return matches.slice(0, maxResults);
}

/**
 * Translate routing matches into the subset of MCP tool servers to activate
 * for the next LLM call. Returns an array of MCP server ids that the caller
 * can merge into the `tools` list of the request.
 *
 * @param {string} text
 * @param {{availableServers?: string[]}} [opts]
 * @returns {string[]}
 */
function routeTools(text, opts = {}) {
  const matches = routeText(text);
  const ids = matches.map((m) => m.id);
  if (opts.availableServers && opts.availableServers.length > 0) {
    const allow = new Set(opts.availableServers);
    return ids.filter((id) => allow.has(id));
  }
  return ids;
}

module.exports = {
  routeText,
  routeTools,
};
