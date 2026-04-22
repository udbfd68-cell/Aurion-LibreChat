/**
 * MCP Contextual Router (engine)
 *
 * Analyzes a user message (string) and returns the list of MCP server
 * names that should be activated for this message, based on the
 * keyword rules declared in `mcpRoutingRules.js`.
 *
 * - Case-insensitive
 * - Accent-insensitive (NFD normalize + strip combining marks)
 * - Substring match
 * - Bilingual FR/EN (driven by rules file)
 *
 * Usage:
 *   const { route } = require('~/server/services/MCP/MCPRouter');
 *   const servers = route('Envoie un email a Paul demain'); // ['gmail','google-calendar']
 */

const { ROUTING_RULES } = require('./mcpRoutingRules');

/**
 * Normalize a string for matching: lowercase + strip diacritics.
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Pre-normalize keywords once at module load for speed.
const NORMALIZED_RULES = ROUTING_RULES.map((rule) => ({
  serverName: rule.serverName,
  priority: rule.priority,
  keywords: rule.keywords.map((k) => normalize(k)),
}));

/**
 * Analyze user message and return relevant MCP server names.
 * Servers are returned sorted by (match count desc, priority desc).
 *
 * @param {string} message - User message text.
 * @returns {string[]} - Array of server names. Empty if no matches.
 */
function route(message) {
  const text = normalize(message);
  if (!text) return [];

  /** @type {Array<{serverName: string, priority: number, hits: number}>} */
  const scored = [];

  for (const rule of NORMALIZED_RULES) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (kw && text.includes(kw)) {
        hits += 1;
      }
    }
    if (hits > 0) {
      scored.push({ serverName: rule.serverName, priority: rule.priority, hits });
    }
  }

  scored.sort((a, b) => b.hits - a.hits || b.priority - a.priority);
  return scored.map((r) => r.serverName);
}

/**
 * @returns {string[]} List of server names declared in the routing rules.
 */
function getAvailableServers() {
  return ROUTING_RULES.map((r) => r.serverName);
}

module.exports = { route, getAvailableServers };
