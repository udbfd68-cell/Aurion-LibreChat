import crypto from 'crypto';
import https from 'https';

/* ── In-memory agent store (persists across warm invocations) ── */
if (!global._agents) global._agents = [
  {
    id: 'agent_aurion_default_001',
    name: 'Aurion Assistant',
    description: 'A powerful autonomous AI assistant with real tools: web search, code execution, REAL browser automation (click/type/navigate), email, calendar, prospecting, file search, and MCP connectors.',
    instructions: 'You are Aurion Assistant, an autonomous AI agent. You have access to REAL tools — use them proactively without ever saying "I cannot".\n\n- `web_search`: for any current info/news/facts → use immediately.\n- `web_browser`: REAL browser automation (Playwright + Chromium). Use this whenever the user says "navigate", "click", "fill", "type", "go to", "browse", or any multi-step web interaction. Actions are a sequence: goto, click, type, press, wait, content (read text), snapshot (accessibility tree), screenshot. Example: [{"type":"goto","url":"https://example.com"},{"type":"content"}].\n- `browser`: lightweight HTTP fetch, use only for simple single-URL text extraction.\n- `execute_code`: always run the code, show output.\n- `send_email`, `read_email`, `calendar`, `prospector`, `file_search`: use when relevant.\n\nAlways plan → act → observe → decide. Chain multiple tool calls. If one fails, try another. Answer in clear Markdown.',
    model: 'gpt-oss:120b',
    provider: 'agents',
    model_parameters: {},
    tools: ['web_search', 'execute_code', 'web_browser', 'browser', 'calendar', 'prospector', 'send_email', 'read_email', 'file_search'],
    tool_kwargs: {}, tool_resources: {},
    avatar: null, category: 'general',
    author: 'user_aurion', authorName: 'AURION', isPublic: false, version: 1,
    conversation_starters: ['Search for the latest AI news', 'Write me a Python script to calculate fibonacci numbers', 'What is the weather in Paris today?'],
    edges: [], end_after_tools: false, hide_sequential_outputs: false, recursion_limit: 25,
    support_contact: {}, tool_options: {},
    created_at: Date.now(), updatedAt: new Date().toISOString(),
  }
];

function agentId() {
  return 'agent_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24);
}

/* ── Fetch MCP tools from the mcp/tools endpoint (same deployment) ── */
function fetchMcpTools(host) {
  return new Promise(function (resolve) {
    var url = 'https://' + host + '/api/mcp/tools';
    https.get(url, { headers: { Accept: 'application/json' }, timeout: 5000 }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ servers: {} }); }
      });
    }).on('error', function () { resolve({ servers: {} }); });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id;
  const type = req.query.type || '';

  /* ── GET /api/agents/tools — Return available tools for agent builder ── */
  if ((id === 'tools' || type === 'tools') && req.method === 'GET') {
    const tools = [
      { name: 'Web Search', pluginKey: 'web_search', description: 'Search the internet for current information using real-time web search', icon: 'search', authenticated: true, authConfig: [] },
      { name: 'Execute Code', pluginKey: 'execute_code', description: 'Run code in a sandboxed environment (Python, JavaScript, etc.)', icon: 'code', authenticated: true, authConfig: [] },
      { name: 'File Search', pluginKey: 'file_search', description: 'Search and retrieve content from uploaded documents', icon: 'file-text', authenticated: true, authConfig: [] },
      { name: 'Browser', pluginKey: 'browser', description: 'Browse web pages, extract content, take screenshots', icon: 'globe', authenticated: true, authConfig: [] },
      { name: 'Web Browser (Playwright)', pluginKey: 'web_browser', description: 'REAL browser automation: navigate, click, type, press keys, wait for elements, take screenshots. Powered by Playwright + Chromium.', icon: 'mouse-pointer-click', authenticated: true, authConfig: [] },
      { name: 'Send Email', pluginKey: 'send_email', description: 'Compose and send emails via SMTP', icon: 'send', authenticated: true, authConfig: [] },
      { name: 'Read Email', pluginKey: 'read_email', description: 'Read and search inbox emails', icon: 'mail', authenticated: true, authConfig: [] },
      { name: 'Calendar', pluginKey: 'calendar', description: 'Create, update, list, and delete calendar events', icon: 'calendar', authenticated: true, authConfig: [] },
      { name: 'Prospector', pluginKey: 'prospector', description: 'Find business leads, contacts, and company information', icon: 'users', authenticated: true, authConfig: [] },
    ];

    // Fetch MCP tools via internal HTTP (separate serverless function has its own globals)
    try {
      var host = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';
      var mcpData = await fetchMcpTools(host);
      var servers = mcpData.servers || {};
      Object.keys(servers).forEach(function (key) {
        var server = servers[key];
        if (server.tools && server.tools.length > 0) {
          server.tools.forEach(function (t) {
            tools.push({
              name: (server.name || key) + ': ' + t.name,
              pluginKey: t.pluginKey || (key + '_' + t.name),
              description: t.description || '',
              icon: server.icon || 'plug',
              authenticated: true,
              authConfig: [],
            });
          });
        }
      });
    } catch (e) { /* MCP tools unavailable, return built-in only */ }

    return res.status(200).json(tools);
  }

  /* ── GET /api/agents — List agents ── */
  if (req.method === 'GET' && !id) {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || '';
    const search = (req.query.search || '').toLowerCase();
    const category = req.query.category || '';

    let filtered = global._agents;
    if (search) filtered = filtered.filter(a => (a.name || '').toLowerCase().includes(search));
    if (category) filtered = filtered.filter(a => a.category === category);

    // Cursor-based pagination
    let startIdx = 0;
    if (cursor) {
      const ci = filtered.findIndex(a => a.id === cursor);
      if (ci >= 0) startIdx = ci + 1;
    }
    const page = filtered.slice(startIdx, startIdx + limit);

    return res.status(200).json({
      object: 'list',
      data: page,
      first_id: page[0]?.id || '',
      last_id: page[page.length - 1]?.id || '',
      has_more: startIdx + limit < filtered.length,
    });
  }

  /* ── GET /api/agents/:id — Get single agent ── */
  if (req.method === 'GET' && id) {
    const agent = global._agents.find(a => a.id === id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    return res.status(200).json(agent);
  }

  /* ── POST /api/agents — Create agent ── */
  if (req.method === 'POST') {
    const b = req.body || {};
    const agent = {
      id: agentId(),
      name: b.name || 'New Agent',
      description: b.description || '',
      instructions: b.instructions || '',
      model: b.model || 'gpt-oss:120b',
      provider: b.provider || 'Aurion',
      model_parameters: b.model_parameters || {},
      tools: b.tools || [],
      tool_kwargs: {},
      tool_resources: {},
      avatar: b.avatar || null,
      category: b.category || 'general',
      author: 'user_aurion',
      authorName: 'AURION',
      isPublic: false,
      version: 1,
      conversation_starters: b.conversation_starters || [],
      edges: b.edges || [],
      end_after_tools: b.end_after_tools || false,
      hide_sequential_outputs: b.hide_sequential_outputs || false,
      artifacts: b.artifacts || undefined,
      recursion_limit: b.recursion_limit || 25,
      support_contact: b.support_contact || {},
      tool_options: b.tool_options || {},
      created_at: Date.now(),
      updatedAt: new Date().toISOString(),
    };
    global._agents.push(agent);
    return res.status(201).json(agent);
  }

  /* ── PUT/PATCH /api/agents/:id — Update agent ── */
  if (['PUT', 'PATCH'].includes(req.method) && id) {
    const idx = global._agents.findIndex(a => a.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Agent not found' });
    const b = req.body || {};
    global._agents[idx] = { ...global._agents[idx], ...b, updatedAt: new Date().toISOString() };
    return res.status(200).json(global._agents[idx]);
  }

  /* ── DELETE /api/agents/:id — Delete agent ── */
  if (req.method === 'DELETE' && id) {
    global._agents = global._agents.filter(a => a.id !== id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
