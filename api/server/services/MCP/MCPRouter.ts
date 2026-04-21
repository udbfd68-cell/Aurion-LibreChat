/**
 * MCP Contextual Router
 * Analyzes user messages and activates relevant MCP servers based on keywords
 */

type RoutingRule = {
  serverName: string;
  keywords: string[];
  priority: number; // Higher priority = checked first
};

const ROUTING_RULES: RoutingRule[] = [
  {
    serverName: 'gmail',
    keywords: ['email', 'mail', 'send email', 'read email', 'inbox', 'compose', 'message', 'check mail'],
    priority: 10,
  },
  {
    serverName: 'google-drive',
    keywords: ['drive', 'file', 'document', 'spreadsheet', 'upload', 'download', 'folder', 'google drive'],
    priority: 10,
  },
  {
    serverName: 'google-calendar',
    keywords: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'agenda', 'book'],
    priority: 10,
  },
  {
    serverName: 'linear',
    keywords: ['linear', 'issue', 'ticket', 'bug', 'task', 'project', 'roadmap', 'cycle'],
    priority: 8,
  },
  {
    serverName: 'github',
    keywords: ['github', 'repo', 'repository', 'commit', 'pr', 'pull request', 'code', 'branch'],
    priority: 8,
  },
  {
    serverName: 'slack',
    keywords: ['slack', 'channel', 'dm', 'message slack', 'post slack', 'slack channel'],
    priority: 7,
  },
  {
    serverName: 'notion',
    keywords: ['notion', 'page', 'database', 'note', 'wiki', 'documentation'],
    priority: 7,
  },
  {
    serverName: 'brave-search',
    keywords: ['search', 'web search', 'google', 'find', 'look up', 'information', 'current', 'news'],
    priority: 5,
  },
  {
    serverName: 'filesystem',
    keywords: ['file', 'read file', 'write file', 'create file', 'workspace', 'directory'],
    priority: 6,
  },
];

/**
 * Analyzes user message and returns list of relevant MCP servers
 * @param message - User message text
 * @returns Array of server names that should be activated
 */
export function route(message: string): string[] {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const lowerMessage = message.toLowerCase();
  const activatedServers = new Map<string, number>(); // serverName -> priority

  // Sort rules by priority (higher first)
  const sortedRules = [...ROUTING_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        // Only add if not already added with higher priority
        if (!activatedServers.has(rule.serverName) || activatedServers.get(rule.serverName)! < rule.priority) {
          activatedServers.set(rule.serverName, rule.priority);
        }
        break; // One keyword match is enough per server
      }
    }
  }

  // Return server names sorted by priority
  return Array.from(activatedServers.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([serverName]) => serverName);
}

/**
 * Get all available MCP server names
 */
export function getAvailableServers(): string[] {
  return ROUTING_RULES.map((rule) => rule.serverName);
}

export default { route, getAvailableServers };
