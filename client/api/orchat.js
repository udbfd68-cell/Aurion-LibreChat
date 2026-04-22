import https from 'https';
import crypto from 'crypto';
import zlib from 'zlib';
import { callTool as mcpCallTool } from './mcp-client.js';
import * as realTools from './real-tools.js';

// ─── Fetch MCP tool index from /api/mcp/tools (cross-function) ───
async function fetchMcpToolIndex(host) {
  if (global._mcpToolIndex && Object.keys(global._mcpToolIndex).length > 0) {
    return global._mcpToolIndex;
  }
  return new Promise(function (resolve) {
    var h = (host || 'client-gold-zeta.vercel.app').replace(/:\d+$/, '');
    var opts = { hostname: h, path: '/api/mcp/tools', method: 'GET', headers: { 'Accept': 'application/json' }, timeout: 8000 };
    var req = https.request(opts, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try {
          var parsed = JSON.parse(data);
          var servers = parsed.servers || {};
          var idx = {};
          var srvCache = {};
          Object.keys(servers).forEach(function (key) {
            var s = servers[key];
            srvCache[key] = s;
            if (s.tools) {
              s.tools.forEach(function (t) {
                idx[t.name] = { serverName: key, sseUrl: s.url, realName: t.name };
                if (t.pluginKey) idx[t.pluginKey] = { serverName: key, sseUrl: s.url, realName: t.name };
              });
            }
          });
          global._mcpToolIndex = idx;
          global._mcpServers = global._mcpServers || {};
          Object.keys(srvCache).forEach(function (k) {
            if (!global._mcpServers[k]) global._mcpServers[k] = srvCache[k];
          });
          resolve(idx);
        } catch (e) { resolve({}); }
      });
    });
    req.on('error', function () { resolve({}); });
    req.on('timeout', function () { req.destroy(); resolve({}); });
    req.end();
  });
}

// ─── Fetch agent config from /api/agents (cross-function) ───
async function fetchAgentConfig(agentId, host) {
  if (!agentId) return null;
  // Check local cache first
  if (global._agents) {
    const cached = global._agents.find(a => a.id === agentId);
    if (cached) return cached;
  }
  // Fetch from agents-handler function
  const allAgents = await fetchAllAgents(host);
  if (allAgents) {
    return allAgents.find(a => a.id === agentId) || null;
  }
  return null;
}

async function fetchAllAgents(host) {
  return new Promise(function (resolve) {
    var h = (host || 'client-gold-zeta.vercel.app').replace(/:\d+$/, '');
    var opts = { hostname: h, path: '/api/agents', method: 'GET', headers: { 'Accept': 'application/json' }, timeout: 5000 };
    var req = https.request(opts, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try {
          var parsed = JSON.parse(data);
          var agents = Array.isArray(parsed) ? parsed : (parsed.data || parsed.agents || []);
          if (Array.isArray(agents) && agents.length > 0) {
            if (!global._agents) global._agents = [];
            agents.forEach(function (a) {
              if (!global._agents.find(x => x.id === a.id)) global._agents.push(a);
            });
            resolve(agents);
          } else { resolve(null); }
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', function () { resolve(null); });
    req.on('timeout', function () { req.destroy(); resolve(null); });
    req.end();
  });
}

// ─── Persistent in-memory store (survives warm invocations) ───
if (!global._orStore) global._orStore = new Map();

function cleanStore() {
  const now = Date.now();
  for (const [k, v] of global._orStore) {
    if (now - v.ts > 30 * 60 * 1000) global._orStore.delete(k);
  }
}

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

function uuid() { return crypto.randomUUID(); }

function encodeCtx(ctx) {
  try {
    return zlib.gzipSync(Buffer.from(JSON.stringify(ctx))).toString('base64url');
  } catch { return null; }
}

function decodeCtx(s) {
  try {
    return JSON.parse(zlib.gunzipSync(Buffer.from(s, 'base64url')).toString());
  } catch { return null; }
}

function sendSSE(res, data) {
  res.write('event: message\ndata: ' + JSON.stringify(data) + '\n\n');
  if (typeof res.flush === 'function') res.flush();
}

function sendSSEError(res, msg) {
  res.write('event: error\ndata: ' + JSON.stringify({ error: msg }) + '\n\n');
  if (typeof res.flush === 'function') res.flush();
}

// ─── Autonomous Agent System Prompt (ReAct framework) ───
const AUTONOMY_PROMPT = `You are an autonomous AI agent. You MUST follow this process for every request:

**PLAN**: Before acting, briefly think about what steps are needed.
**ACT**: Use your tools to gather information or perform actions. You have REAL tools — use them.
**OBSERVE**: Analyze the tool results carefully.
**DECIDE**: If you have enough information, provide your comprehensive answer. If not, use more tools.

RULES:
- ALWAYS use tools when the user asks for current/real-time information. Never say "I cannot access the web."
- If a tool returns an error, try a different approach (different query, different tool).
- You can chain multiple tool calls across iterations to build comprehensive answers.
- When searching, if results are poor, reformulate the query and search again.
- Combine results from multiple tool calls into a single well-structured response.
- For code execution: write the code, run it, and show the output.
- For research: search from multiple angles, cross-reference results.
- Provide citations with URLs when presenting search results.
- Format responses in clear Markdown with headers, lists, and links.
- Be thorough. The user expects complete, well-researched answers.`;

// ─── Built-in tool definitions for OpenRouter function calling ───
const BUILTIN_TOOLS = {
  web_search: { type: 'function', function: { name: 'web_search', description: 'Search the internet for current information. Use this whenever the user asks about recent events, news, facts, or anything that requires up-to-date information.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query — be specific and include relevant keywords' } }, required: ['query'] } } },
  send_email: { type: 'function', function: { name: 'send_email', description: 'Send an email to one or more recipients with subject and HTML body', parameters: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email address' }, subject: { type: 'string', description: 'Email subject line' }, body: { type: 'string', description: 'Email body content (supports HTML)' } }, required: ['to', 'subject', 'body'] } } },
  read_email: { type: 'function', function: { name: 'read_email', description: 'Read emails from the configured IMAP mailbox. Can search by sender, subject, or filter unread/flagged emails.', parameters: { type: 'object', properties: { folder: { type: 'string', description: 'IMAP folder: INBOX, Sent, Drafts, Trash, Spam' }, search: { type: 'string', description: 'Search filter: email address (searches FROM), "unread", "flagged", "today", or keywords (searches SUBJECT)' }, limit: { type: 'number', description: 'Maximum emails to return (default 10, max 25)' } } } } },
  execute_code: { type: 'function', function: { name: 'execute_code', description: 'Execute code in a sandboxed environment. Supports Python, JavaScript, TypeScript, Java, C, C++, Go, Rust, Ruby, PHP, Bash, Perl, Haskell, Lua, Swift, C#, Scala, Kotlin, R.', parameters: { type: 'object', properties: { language: { type: 'string', description: 'Programming language (python, javascript, typescript, java, c, cpp, go, rust, ruby, php, bash, etc.)' }, code: { type: 'string', description: 'Source code to execute' } }, required: ['code'] } } },
  file_search: { type: 'function', function: { name: 'file_search', description: 'Search through uploaded documents using keyword matching. Returns relevant passages with context. Upload files first via the file upload feature.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query — keywords or phrases to find in uploaded documents' } }, required: ['query'] } } },
  prospector: { type: 'function', function: { name: 'prospector', description: 'Find business leads, contacts, and decision-makers using multi-strategy web search. Searches LinkedIn profiles, company pages, and public contact info.', parameters: { type: 'object', properties: { company: { type: 'string', description: 'Company name to research (e.g., "Stripe", "OpenAI")' }, role: { type: 'string', description: 'Job title or role to find (e.g., "CTO", "VP Sales", "Head of Engineering")' }, industry: { type: 'string', description: 'Industry sector (e.g., "fintech", "AI/ML", "healthcare")' } } } } },
  calendar: { type: 'function', function: { name: 'calendar', description: 'Manage calendar events: create, list, update, delete, search, or clear all events. Supports natural language dates (today, tomorrow, next monday, in 3 days).', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'update', 'delete', 'search', 'clear'], description: 'Operation to perform' }, title: { type: 'string', description: 'Event title (required for create; used as search query for search action)' }, date: { type: 'string', description: 'Date: ISO 8601, "today", "tomorrow", "next monday", "in 3 days", etc.' }, eventId: { type: 'string', description: 'Event ID (required for update/delete)' } }, required: ['action'] } } },
  browser: { type: 'function', function: { name: 'browser', description: 'Browse any web page and extract its text content, links, and metadata. Use this to read articles, documentation, or any URL.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'Full URL to browse (https://...)' }, action: { type: 'string', enum: ['read', 'click', 'screenshot'], description: 'Action to perform (default: read)' } }, required: ['url'] } } },
  web_browser: { type: 'function', function: { name: 'web_browser', description: 'REAL browser automation powered by Playwright + Chromium. Navigate, click, type, press keys, wait for elements, screenshot, and read the page. Use this (NOT "browser") whenever the user asks you to click, type into a form, navigate multi-step, or interact with a website. For simple reads, pass url + action="read". For multi-step, pass actionsJson as a JSON-encoded array of steps like \'[{"type":"goto","url":"..."},{"type":"click","selector":"..."},{"type":"content"}]\'. Step types: goto, click, type, press, wait, content, snapshot, screenshot.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL to navigate to (for simple single-page reads)' }, action: { type: 'string', description: 'Simple action: "read" to fetch page content, "screenshot" for an image (default: read)' }, actionsJson: { type: 'string', description: 'JSON string of advanced action array for multi-step interactions.' } } } } },
};

async function buildToolDefs(toolNames, host) {
  if (!toolNames || !toolNames.length) return [];
  const defs = [];

  // Ensure MCP tool index is populated (fetch from misc.js if needed)
  await fetchMcpToolIndex(host);
  const toolIndex = global._mcpToolIndex || {};
  const mcpServers = global._mcpServers || {};

  toolNames.forEach(function (name) {
    const key = typeof name === 'string' ? name : (name.name || name.type || '');
    if (!key) return;

    // 1. Check built-in tools
    if (BUILTIN_TOOLS[key]) {
      defs.push(BUILTIN_TOOLS[key]);
      return;
    }

    // 2. Check MCP tool index (pluginKey or raw name)
    if (toolIndex[key]) {
      const entry = toolIndex[key];
      const server = mcpServers[entry.serverName];
      if (server && server.tools) {
        const mcpTool = server.tools.find(function (t) { return t.pluginKey === key || t.name === key; });
        if (mcpTool) {
          defs.push({
            type: 'function',
            function: {
              name: mcpTool.name,
              description: mcpTool.description || 'MCP tool from ' + (server.title || entry.serverName),
              parameters: mcpTool.inputSchema || { type: 'object', properties: {} },
            },
          });
          return;
        }
      }
    }

    // 3. Check all MCP servers for a tool matching by name
    var found = false;
    Object.keys(mcpServers).forEach(function (sName) {
      if (found) return;
      var s = mcpServers[sName];
      if (s.tools) {
        var t = s.tools.find(function (tool) { return tool.pluginKey === key || tool.name === key; });
        if (t) {
          defs.push({
            type: 'function',
            function: {
              name: t.name,
              description: t.description || '',
              parameters: t.inputSchema || { type: 'object', properties: {} },
            },
          });
          found = true;
        }
      }
    });
    if (found) return;

    // 4. Generic fallback
    defs.push({ type: 'function', function: { name: key, description: 'Execute ' + key, parameters: { type: 'object', properties: { input: { type: 'string' } } } } });
  });

  return defs;
}

/**
 * Execute a tool call — routes to real MCP servers when available,
 * falls back to built-in handlers otherwise.
 */
async function executeTool(name, args, host) {
  // Ensure MCP tool index is populated
  await fetchMcpToolIndex(host);
  const toolIndex = global._mcpToolIndex || {};
  const mcpEntry = toolIndex[name];

  if (mcpEntry && mcpEntry.sseUrl) {
    try {
      const realName = mcpEntry.realName || name;
      const result = await mcpCallTool(mcpEntry.sseUrl, realName, args, 20000);

      // MCP returns { content: [{type:'text', text:'...'}, ...], isError?: boolean }
      if (result && result.content) {
        const textParts = result.content
          .filter(function (c) { return c.type === 'text'; })
          .map(function (c) { return c.text; });
        if (textParts.length > 0) return textParts.join('\n');
        return JSON.stringify(result.content);
      }
      return JSON.stringify(result || { status: 'ok' });
    } catch (err) {
      return JSON.stringify({ error: 'MCP tool error: ' + (err.message || 'unknown'), tool: name });
    }
  }

  // ── REAL tool implementations (no fakes) ──
  switch (name) {
    case 'web_search': return realTools.webSearch(args.query);
    case 'send_email': return realTools.sendEmail(args.to, args.subject, args.body);
    case 'read_email': return realTools.readEmail(args.folder, args.search, args.limit);
    case 'execute_code': return realTools.executeCode(args.language, args.code);
    case 'file_search': return realTools.fileSearch(args.query);
    case 'prospector': return realTools.prospector(args.company, args.role, args.industry);
    case 'calendar': return realTools.calendar(args.action, args.title, args.date, args.eventId || args.id);
    case 'browser': return realTools.browser(args.url, args.action);
    case 'web_browser': return realTools.webBrowser(args);
    default: return JSON.stringify({ error: 'Unknown tool: ' + name + '. This tool has no implementation.' });
  }
}

function callOpenRouterSync(model, messages, tools, temperature, maxTokens) {
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
  const useOpenRouter = !!OPENROUTER_KEY;
  const hostname = useOpenRouter ? 'openrouter.ai' : 'ollama.com';
  const path = useOpenRouter ? '/api/v1/chat/completions' : '/v1/chat/completions';
  const authKey = useOpenRouter ? OPENROUTER_KEY : OLLAMA_API_KEY;
  const extraHeaders = useOpenRouter
    ? { 'HTTP-Referer': 'https://client-gold-zeta.vercel.app', 'X-Title': 'Aurion Chat' }
    : {};
  const reqBody = JSON.stringify({ model, messages, tools, temperature, max_tokens: maxTokens });
  return new Promise((resolve) => {
    const apiReq = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authKey, 'Content-Length': Buffer.byteLength(reqBody), ...extraHeaders },
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); } });
    });
    apiReq.on('error', e => resolve({ error: e.message }));
    apiReq.setTimeout(60000, () => { apiReq.destroy(); resolve({ error: 'timeout' }); });
    apiReq.write(reqBody);
    apiReq.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Determine action from query param ──
  const action = req.query.action; // 'post', 'stream', 'direct', 'abort', 'active', 'status'
  const streamId = req.query.id || '';

  // ═══ DIRECT: Single-request SSE (frontend POST → immediate SSE response) ═══
  if (action === 'direct' && req.method === 'POST') {
    const body = req.body || {};
    const model = body.model_parameters?.model || body.model || body.agentOption?.model || 'gemma4:31b';
    const text = body.text || body.editedContent || '';
    const userMessageId = body.messageId || uuid();
    const parentMessageId = body.parentMessageId || '00000000-0000-0000-0000-000000000000';
    const incomingConvoId = body.conversationId;
    const temperature = body.model_parameters?.temperature ?? body.temperature ?? 0.7;
    const maxTokens = body.model_parameters?.maxOutputTokens ?? body.max_tokens ?? 4096;

    const agentId = body.agent_id || body.agentOption?.agent_id || '';
    let agentInstructions = body.instructions || body.agentOption?.instructions || '';
    let agentName = '';
    let agentTools = body.tools || [];
    const reqHostDirect = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';
    if (agentId) {
      let agent = global._agents && global._agents.find(a => a.id === agentId);
      if (!agent) agent = await fetchAgentConfig(agentId, reqHostDirect);
      if (agent) {
        if (!agentInstructions) agentInstructions = agent.instructions || '';
        agentName = agent.name || '';
        if (agent.model) body._agentModel = agent.model;
        if (agent.tools && agent.tools.length) {
          agentTools = [...new Set([...agentTools, ...agent.tools])];
        }
      }
    }

    const conversationId = (incomingConvoId && incomingConvoId !== 'new') ? incomingConvoId : uuid();
    let messages = [];
    cleanStore();
    const stored = global._orStore.get(conversationId);
    if (stored && stored.messages) messages = stored.messages;
    if (messages.length === 0) {
      const ck = getCookie(req, '_or_ctx');
      if (ck) { const ctx = decodeCtx(ck); if (ctx && ctx.cid === conversationId && ctx.msgs) messages = ctx.msgs; }
    }
    if (text) messages.push({ role: 'user', content: text });
    if (messages.length > 40) messages = messages.slice(-40);

    const finalModel = body._agentModel || model;

    // Store context for future requests in same conversation
    const ctx = { model: finalModel, messages, userMessageId, parentMessageId, conversationId, temperature, maxTokens, text, ts: Date.now(), agentInstructions, agentId, agentName, agentTools };
    global._orStore.set(conversationId, ctx);

    // Start SSE immediately
    // Either OLLAMA_API_KEY (primary) or OPENROUTER_KEY (fallback/tools) must be set.
    // If only OPENROUTER_KEY is set, the Ollama call at line ~439 will 401 and the fallback
    // to the Render backend (proxySSEToRender) will take over.
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
    if (!OLLAMA_API_KEY && !OPENROUTER_KEY) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      sendSSEError(res, 'Aurion API key not configured');
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'identity',
    });

    const responseMessageId = uuid();
    const stepId = uuid();
    const textStepId = uuid();
    let textStepSent = false;
    let toolContentIndex = 0;
    let toolCallParts = [];

    // CREATED event
    sendSSE(res, {
      created: true,
      message: { messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId, conversationId: ctx.conversationId, text: ctx.text || '', isCreatedByUser: true, sender: 'User' },
      streamId: ctx.conversationId,
    });

    const apiMessages = [];
    if (ctx.agentInstructions) apiMessages.push({ role: 'system', content: ctx.agentInstructions });
    apiMessages.push(...ctx.messages);

    // Tool calling loop — ReAct agent: up to 10 iterations for autonomous multi-step reasoning
    const reqHost = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';
    const toolDefs = await buildToolDefs(ctx.agentTools, reqHost);
    if (toolDefs.length > 0) {
      let loopCount = 0;
      while (loopCount < 10) {
        loopCount++;
        const toolResult = await callOpenRouterSync(ctx.model, apiMessages, toolDefs, ctx.temperature, ctx.maxTokens);
        if (toolResult.error || !toolResult.choices || !toolResult.choices[0] || !toolResult.choices[0].message || !toolResult.choices[0].message.tool_calls || !toolResult.choices[0].message.tool_calls.length) break;
        const choice = toolResult.choices[0];
        apiMessages.push({ role: 'assistant', content: choice.message.content || null, tool_calls: choice.message.tool_calls });
        for (const tc of choice.message.tool_calls) {
          const toolStepId = uuid();
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}
          sendSSE(res, { event: 'on_run_step', data: { id: toolStepId, runId: responseMessageId, index: toolContentIndex, type: 'tool_calls', stepDetails: { type: 'tool_calls', tool_calls: [{ id: tc.id, name: tc.function.name, args: tc.function.arguments, type: 'tool_call' }] }, usage: null } });
          const toolOutput = await executeTool(tc.function.name, args, reqHost);
          sendSSE(res, { event: 'on_run_step_completed', data: { result: { id: toolStepId, index: toolContentIndex, tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 } } } });
          sendSSE(res, { event: 'text_delta', data: { content: `Using ${tc.function.name}...`, type: 'tool' } });
          toolCallParts.push({ type: 'tool_call', tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 } });
          toolContentIndex++;
          apiMessages.push({ role: 'tool', tool_call_id: tc.id, content: toolOutput });
        }
      }
    }

    sendSSE(res, { event: 'on_run_step', data: { type: 'message_creation', id: stepId, runId: responseMessageId, index: toolContentIndex, stepDetails: { type: 'message_creation', message_creation: { message_id: responseMessageId } }, usage: null } });

    const requestBody = JSON.stringify({
      model: ctx.model, messages: apiMessages, stream: true,
      temperature: ctx.temperature, max_tokens: ctx.maxTokens,
      ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
    });

    let fullText = '';
    let streamError = null;
    

    function flushText(content) {
      if (!content) return;
      fullText += content;
      const sid = stepId;
      const idx = toolContentIndex;
      sendSSE(res, { event: 'on_message_delta', data: { id: sid, delta: { content: [{ index: idx, type: 'text', text: content }] } } });
    }

    function processContent(chunk) {
      flushText(chunk);
    }

    await new Promise((resolve) => {
      // Prefer OpenRouter when configured (works with tool-calling loop above);
      // fall back to ollama.com only if OPENROUTER_KEY is absent.
      const useOpenRouter = !!OPENROUTER_KEY;
      const host = useOpenRouter ? 'openrouter.ai' : 'ollama.com';
      const path = useOpenRouter ? '/api/v1/chat/completions' : '/v1/chat/completions';
      const authKey = useOpenRouter ? OPENROUTER_KEY : OLLAMA_API_KEY;
      const extraHeaders = useOpenRouter
        ? { 'HTTP-Referer': 'https://client-gold-zeta.vercel.app', 'X-Title': 'Aurion Chat' }
        : {};
      const apiReq = https.request({
        hostname: host, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authKey, 'Content-Length': Buffer.byteLength(requestBody), ...extraHeaders },
      }, (apiRes) => {
        if (apiRes.statusCode !== 200) {
          let errBody = '';
          apiRes.on('data', (c) => (errBody += c));
          apiRes.on('end', () => {
            streamError = 'Aurion error ' + apiRes.statusCode + ': ' + errBody.substring(0, 500);
            console.error('[ORCHAT] Upstream error (' + host + '):', streamError);
            resolve();
          });
          return;
        }
        let buffer = '';
        apiRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.substring(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const choice = parsed.choices?.[0];
              if (!choice) continue;
              const delta = choice.delta;
              
              if (delta?.content) processContent(delta.content);
              // Stream reasoning tokens for thinking models (o1, o3, claude-thinking, deepseek-r1)
              if (delta?.reasoning) {
                sendSSE(res, { event: 'on_reasoning_delta', data: { id: stepId, delta: { content: [{ type: 'text', text: delta.reasoning }] } } });
              }
            } catch { /* skip */ }
          }
        });
        apiRes.on('end', () => {
          
          resolve();
        });
        apiRes.on('error', (err) => { streamError = 'Stream error: ' + (err.message || 'unknown'); resolve(); });
      });
      apiReq.on('error', (err) => { streamError = 'Request error: ' + (err.message || 'unknown'); resolve(); });
      apiReq.write(requestBody);
      apiReq.end();
    });

    if (streamError && !fullText) { sendSSEError(res, streamError); res.end(); return; }

    const contentParts = [...toolCallParts];
    contentParts.push({ type: 'text', text: { value: fullText } });

    const firstUserMsg = ctx.messages.find((m) => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat';
    const endpointName = body.endpoint || 'custom';

    sendSSE(res, {
      final: true,
      conversation: { conversationId: ctx.conversationId, title, endpoint: endpointName, model: ctx.model, chatGptLabel: null, promptPrefix: null, temperature: ctx.temperature, maxOutputTokens: ctx.maxTokens, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      title,
      requestMessage: { messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId, conversationId: ctx.conversationId, text: ctx.text || '', isCreatedByUser: true, sender: 'User', endpoint: endpointName, model: ctx.model },
      responseMessage: { messageId: responseMessageId, parentMessageId: ctx.userMessageId, conversationId: ctx.conversationId, content: contentParts, text: fullText, sender: ctx.model, endpoint: endpointName, model: ctx.model, isCreatedByUser: false, unfinished: !!streamError },
    });

    const updatedMsgs = [...ctx.messages, { role: 'assistant', content: fullText }];
    if (updatedMsgs.length > 40) updatedMsgs.splice(0, updatedMsgs.length - 40);
    global._orStore.set(ctx.conversationId, { ...ctx, messages: updatedMsgs, ts: Date.now() });
    return res.end();
  }

  // ═══ POST: Start Chat ═══
  if (action === 'post' && req.method === 'POST') {
    const body = req.body || {};
    const model = body.model_parameters?.model || body.model || body.agentOption?.model || 'gemma4:31b';
    const text = body.text || body.editedContent || '';
    const userMessageId = body.messageId || uuid();
    const parentMessageId = body.parentMessageId || '00000000-0000-0000-0000-000000000000';
    const incomingConvoId = body.conversationId;
    const temperature = body.model_parameters?.temperature ?? body.temperature ?? 0.7;
    const maxTokens = body.model_parameters?.maxOutputTokens ?? body.max_tokens ?? 4096;

    // ── Agent instructions injection ──
    const agentId = body.agent_id || body.agentOption?.agent_id || '';
    let agentInstructions = body.instructions || body.agentOption?.instructions || '';
    let agentName = '';
    let agentTools = body.tools || [];
    const reqHost = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';
    if (agentId) {
      let agent = global._agents && global._agents.find(a => a.id === agentId);
      if (!agent) agent = await fetchAgentConfig(agentId, reqHost);
      if (agent) {
        if (!agentInstructions) agentInstructions = agent.instructions || '';
        agentName = agent.name || '';
        if (agent.model) body._agentModel = agent.model;
        if (agent.tools && agent.tools.length) {
          agentTools = [...new Set([...agentTools, ...agent.tools])];
        }
      }
    }

    const conversationId = (incomingConvoId && incomingConvoId !== 'new') ? incomingConvoId : uuid();

    let messages = [];
    cleanStore();

    // Try global store (warm function)
    const stored = global._orStore.get(conversationId);
    if (stored && stored.messages) messages = stored.messages;

    // Fallback: cookie
    if (messages.length === 0) {
      const ck = getCookie(req, '_or_ctx');
      if (ck) {
        const ctx = decodeCtx(ck);
        if (ctx && ctx.cid === conversationId && ctx.msgs) messages = ctx.msgs;
      }
    }

    if (text) messages.push({ role: 'user', content: text });
    if (messages.length > 40) messages = messages.slice(-40);

    // Prepend agent system prompt if we have agent instructions
    const finalModel = body._agentModel || model;

    const endpoint = body.endpoint || 'custom';
    const entry = { model: finalModel, messages, userMessageId, parentMessageId, conversationId, temperature, maxTokens, text, ts: Date.now(), agentInstructions, agentId, agentName, agentTools, endpoint };
    global._orStore.set(conversationId, entry);

    // Cookie backup (include agentId for cross-instance recovery)
    const ck = encodeCtx({ cid: conversationId, model, msgs: messages, t: temperature, mx: maxTokens, aid: agentId });
    if (ck && ck.length < 3800) {
      res.setHeader('Set-Cookie', '_or_ctx=' + ck + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600');
    }

    // Encode minimal context into streamId for cross-instance recovery
    // This ensures the GET handler can reconstruct context from URL alone
    const ctxPayload = encodeCtx({ cid: conversationId, model: finalModel, msgs: messages, t: temperature, mx: maxTokens, aid: agentId });
    const encodedStreamId = ctxPayload ? conversationId + '.' + ctxPayload : conversationId;

    return res.status(200).json({ streamId: encodedStreamId, conversationId, status: 'started' });
  }

  // ═══ GET: SSE Stream ═══
  if (action === 'stream' && req.method === 'GET') {
    cleanStore();

    // Parse streamId: may be "uuid" or "uuid.encodedContext"
    let realStreamId = streamId;
    let embeddedCtx = null;
    const dotIdx = streamId.indexOf('.');
    if (dotIdx > 0) {
      realStreamId = streamId.substring(0, dotIdx);
      const ctxPart = streamId.substring(dotIdx + 1);
      embeddedCtx = decodeCtx(ctxPart);
    }

    let ctx = global._orStore.get(realStreamId);

    // Fallback 1: decode from embedded context in streamId (cross-instance safe)
    if (!ctx && embeddedCtx && embeddedCtx.cid) {
      ctx = {
        model: embeddedCtx.model, messages: embeddedCtx.msgs || [],
        temperature: embeddedCtx.t || 0.7, maxTokens: embeddedCtx.mx || 4096,
        userMessageId: uuid(), parentMessageId: '00000000-0000-0000-0000-000000000000',
        conversationId: embeddedCtx.cid, text: embeddedCtx.msgs?.[embeddedCtx.msgs.length - 1]?.content || '',
        ts: Date.now(), agentId: embeddedCtx.aid || '',
      };
    }

    // Fallback 2: cookie
    if (!ctx) {
      const ck = getCookie(req, '_or_ctx');
      if (ck) {
        const decoded = decodeCtx(ck);
        if (decoded && (decoded.cid === realStreamId || decoded.cid === streamId)) {
          ctx = {
            model: decoded.model, messages: decoded.msgs,
            temperature: decoded.t || 0.7, maxTokens: decoded.mx || 4096,
            userMessageId: uuid(), parentMessageId: '00000000-0000-0000-0000-000000000000',
            conversationId: decoded.cid, text: decoded.msgs?.[decoded.msgs.length - 1]?.content || '',
            ts: Date.now(), agentId: decoded.aid || '',
          };
        }
      }
    }

    // No context found at all — return error instead of proxying to external server
    if (!ctx) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' });
      sendSSEError(res, 'Stream context not found. Please try sending your message again.');
      sendSSE(res, { final: true, conversation: { conversationId: realStreamId, title: 'Error', endpoint: 'custom' }, responseMessage: { messageId: uuid(), conversationId: realStreamId, text: 'Stream context not found. Please try sending your message again.', content: [{ type: 'text', text: { value: 'Stream context not found. Please try sending your message again.' } }], isCreatedByUser: false, sender: 'System', unfinished: true } });
      return res.end();
    }

    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
    if (!OLLAMA_API_KEY && !OPENROUTER_KEY) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      sendSSEError(res, 'Aurion API key not configured');
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'identity',
    });

    const responseMessageId = uuid();

    const stepId = uuid();       // run step for reasoning (index 0)
    const textStepId = uuid();   // run step for text when reasoning is present (index 1)
    let textStepSent = false;    // have we sent the second on_run_step yet?
    let toolContentIndex = 0;    // content index offset from tool calls
    let toolCallParts = [];      // tool call content for final event

    // CREATED event
    sendSSE(res, {
      created: true,
      message: { messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId, conversationId: ctx.conversationId, text: ctx.text || '', isCreatedByUser: true, sender: 'User' },
      streamId: ctx.conversationId,
    });

    // Call Aurion API — build messages with agent system prompt
    const apiMessages = [];
    if (ctx.agentInstructions) {
      apiMessages.push({ role: 'system', content: ctx.agentInstructions + '\n\n' + AUTONOMY_PROMPT });
    } else {
      apiMessages.push({ role: 'system', content: AUTONOMY_PROMPT });
    }
    apiMessages.push(...ctx.messages);

    // ── Tool calling loop (if agent has tools) ──
    // If ctx has no agentTools but has agentId, try fetching agent config now
    const reqHost2 = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';
    // Try to recover agentId from Referer URL or query params if not in ctx
    if (!ctx.agentId) {
      const referer = req.headers.referer || '';
      const aidMatch = referer.match(/agent_id=([^&]+)/);
      if (aidMatch) ctx.agentId = aidMatch[1];
    }
    if (!ctx.agentId) {
      const qaid = req.query.agent_id || '';
      if (qaid) ctx.agentId = qaid;
    }
    if ((!ctx.agentTools || !ctx.agentTools.length) && ctx.agentId) {
      const agent = await fetchAgentConfig(ctx.agentId, reqHost2);
      if (agent && agent.tools && agent.tools.length) {
        ctx.agentTools = agent.tools;
        if (!ctx.agentInstructions && agent.instructions) {
          ctx.agentInstructions = agent.instructions;
          apiMessages.unshift({ role: 'system', content: agent.instructions });
        }
      }
    }
    // If still no tools, try fetching ALL agents and check if any match conversation context
    if ((!ctx.agentTools || !ctx.agentTools.length) && !ctx.agentId) {
      // Last resort: fetch all agents and use the first one if only one exists
      const allAgents = await fetchAllAgents(reqHost2);
      if (allAgents && allAgents.length === 1) {
        const agent = allAgents[0];
        ctx.agentId = agent.id;
        ctx.agentTools = agent.tools || [];
        if (!ctx.agentInstructions && agent.instructions) {
          ctx.agentInstructions = agent.instructions;
          apiMessages.unshift({ role: 'system', content: agent.instructions });
        }
      }
    }
    const toolDefs = await buildToolDefs(ctx.agentTools, reqHost2);
    if (toolDefs.length > 0) {
      let loopCount = 0;
      while (loopCount < 10) {
        loopCount++;
        const toolResult = await callOpenRouterSync(ctx.model, apiMessages, toolDefs, ctx.temperature, ctx.maxTokens);
        if (toolResult.error || !toolResult.choices || !toolResult.choices[0] || !toolResult.choices[0].message || !toolResult.choices[0].message.tool_calls || !toolResult.choices[0].message.tool_calls.length) break;
        const choice = toolResult.choices[0];
        apiMessages.push({ role: 'assistant', content: choice.message.content || null, tool_calls: choice.message.tool_calls });
        for (const tc of choice.message.tool_calls) {
          const toolStepId = uuid();
          let args = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}

          // Send tool call SSE event BEFORE execution
          sendSSE(res, { event: 'on_run_step', data: { id: toolStepId, runId: responseMessageId, index: toolContentIndex, type: 'tool_calls', stepDetails: { type: 'tool_calls', tool_calls: [{ id: tc.id, name: tc.function.name, args: tc.function.arguments, type: 'tool_call' }] }, usage: null } });

          // REAL tool execution — may connect to MCP server
          const toolOutput = await executeTool(tc.function.name, args, reqHost2);

          // Send tool completed SSE event
          sendSSE(res, { event: 'on_run_step_completed', data: { result: { id: toolStepId, index: toolContentIndex, tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 } } } });
          sendSSE(res, { event: 'text_delta', data: { content: `Using ${tc.function.name}...`, type: 'tool' } });
          toolCallParts.push({ type: 'tool_call', tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 } });
          toolContentIndex++;
          apiMessages.push({ role: 'tool', tool_call_id: tc.id, content: toolOutput });
        }
      }
    }

    // on_run_step: declare content slot for message text
    sendSSE(res, {
      event: 'on_run_step',
      data: {
        type: 'message_creation',
        id: stepId,
        runId: responseMessageId,
        index: toolContentIndex,
        stepDetails: { type: 'message_creation', message_creation: { message_id: responseMessageId } },
        usage: null,
      },
    });

    const requestBody = JSON.stringify({
      model: ctx.model, messages: apiMessages, stream: true,
      temperature: ctx.temperature, max_tokens: ctx.maxTokens,
      ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
    });

    let fullText = '';
    let streamError = null;

    function flushText(content) {
      if (!content) return;
      fullText += content;
      sendSSE(res, { event: 'on_message_delta', data: { id: stepId, delta: { content: [{ index: toolContentIndex, type: 'text', text: content }] } } });
    }

    await new Promise((resolve) => {
      const useOpenRouter = !!OPENROUTER_KEY;
      const host = useOpenRouter ? 'openrouter.ai' : 'ollama.com';
      const path = useOpenRouter ? '/api/v1/chat/completions' : '/v1/chat/completions';
      const authKey = useOpenRouter ? OPENROUTER_KEY : OLLAMA_API_KEY;
      const extraHeaders = useOpenRouter
        ? { 'HTTP-Referer': 'https://client-gold-zeta.vercel.app', 'X-Title': 'Aurion Chat' }
        : {};
      const apiReq = https.request({
        hostname: host, path, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authKey,
          'Content-Length': Buffer.byteLength(requestBody),
          ...extraHeaders,
        },
      }, (apiRes) => {
        if (apiRes.statusCode !== 200) {
          let errBody = '';
          apiRes.on('data', (c) => (errBody += c));
          apiRes.on('end', () => {
            streamError = 'Aurion error ' + apiRes.statusCode + ': ' + errBody.substring(0, 500);
            console.error('[ORCHAT] Upstream error (' + host + ' GET stream):', streamError);
            resolve();
          });
          return;
        }

        let buffer = '';
        apiRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.substring(6);
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              const choice = parsed.choices?.[0];
              if (!choice) continue;
              const delta = choice.delta;

              // Models that use delta.reasoning (e.g. deepseek)
              if (delta?.reasoning) {
                flushThink(delta.reasoning);
              }

              // Models that use delta.content (may contain <think> tags like nemotron)
              if (delta?.content) {
                processContent(delta.content);
              }
            } catch { /* skip */ }
          }
        });

        apiRes.on('end', () => {
          // Flush any remaining buffered content
          
          resolve();
        });
        apiRes.on('error', (err) => { streamError = 'Stream error: ' + (err.message || 'unknown'); resolve(); });
      });

      apiReq.on('error', (err) => { streamError = 'Request error: ' + (err.message || 'unknown'); resolve(); });
      apiReq.write(requestBody);
      apiReq.end();
    });

    if (streamError && !fullText) {
      sendSSEError(res, streamError);
      res.end();
      return;
    }

    // Build content
    const contentParts = [...toolCallParts];
    contentParts.push({ type: 'text', text: { value: fullText } });

    const firstUserMsg = ctx.messages.find((m) => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat';

    // FINAL event
    sendSSE(res, {
      final: true,
      conversation: { conversationId: ctx.conversationId, title, endpoint: ctx.endpoint || 'custom', model: ctx.model, chatGptLabel: null, promptPrefix: null, temperature: ctx.temperature, maxOutputTokens: ctx.maxTokens, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      title,
      requestMessage: { messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId, conversationId: ctx.conversationId, text: ctx.text || '', isCreatedByUser: true, sender: 'User', endpoint: ctx.endpoint || 'custom', model: ctx.model },
      responseMessage: { messageId: responseMessageId, parentMessageId: ctx.userMessageId, conversationId: ctx.conversationId, content: contentParts, text: fullText, sender: ctx.model, endpoint: ctx.endpoint || 'custom', model: ctx.model, isCreatedByUser: false, unfinished: !!streamError },
    });

    // Update store with assistant response
    const updatedMsgs = [...ctx.messages, { role: 'assistant', content: fullText }];
    if (updatedMsgs.length > 40) updatedMsgs.splice(0, updatedMsgs.length - 40);
    global._orStore.set(ctx.conversationId, { ...ctx, messages: updatedMsgs, ts: Date.now() });

    return res.end();
  }

  // ═══ POST: Abort ═══
  if (action === 'abort' && req.method === 'POST') {
    return res.status(200).json({ success: true });
  }

  // ═══ GET: Active ═══
  if (action === 'active' && req.method === 'GET') {
    return res.status(200).json({ activeJobIds: [] });
  }

  // ═══ GET: Status ═══
  if (action === 'status' && req.method === 'GET') {
    const statusId = streamId.indexOf('.') > 0 ? streamId.substring(0, streamId.indexOf('.')) : streamId;
    const stored = global._orStore.get(statusId);
    return res.status(200).json({ active: !!stored, streamId: statusId, status: stored ? 'processing' : 'completed' });
  }

  // ═══ GET: Generate Title ═══
  if (action === 'gen-title') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    const firstMsg = ctx?.messages?.find(m => m.role === 'user');
    const title = firstMsg ? firstMsg.content.substring(0, 60) : 'New Chat';
    return res.status(200).json({ title });
  }

  // ═══ GET: Conversation Detail ═══
  if (action === 'convo-detail') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    if (!ctx) return res.status(200).json({ conversationId: convoId, title: 'New Chat', endpoint: 'custom', model: 'gemma4:31b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const firstUserMsg = ctx.messages?.find(m => m.role === 'user');
    return res.status(200).json({
      conversationId: convoId,
      title: firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat',
      endpoint: ctx.endpoint || 'custom',
      model: ctx.model || 'gemma4:31b',
      temperature: ctx.temperature || 0.7,
      maxOutputTokens: ctx.maxTokens || 4096,
      createdAt: new Date(ctx.ts || Date.now()).toISOString(),
      updatedAt: new Date(ctx.ts || Date.now()).toISOString(),
    });
  }

  // ═══ GET: Messages for Conversation ═══
  if (action === 'messages') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    if (!ctx || !ctx.messages) return res.status(200).json([]);

    const now = new Date().toISOString();
    const result = [];
    let prevMsgId = '00000000-0000-0000-0000-000000000000';

    for (let i = 0; i < ctx.messages.length; i++) {
      const m = ctx.messages[i];
      const msgId = (m.role === 'user' && i === 0 && ctx.userMessageId) ? ctx.userMessageId : uuid();
      result.push({
        messageId: msgId,
        conversationId: convoId,
        parentMessageId: prevMsgId,
        text: m.content || '',
        isCreatedByUser: m.role === 'user',
        sender: m.role === 'user' ? 'User' : (ctx.model || 'AI'),
        model: m.role !== 'user' ? (ctx.model || 'gemma4:31b') : undefined,
        endpoint: ctx.endpoint || 'custom',
        error: false,
        unfinished: false,
        createdAt: now,
        updatedAt: now,
      });
      prevMsgId = msgId;
    }

    return res.status(200).json(result);
  }

  // Fallback
  return res.status(200).json({ ok: true });
};

// ─── Proxy SSE to Render ───
function proxySSEToRender(req, res, streamId) {
  const url = '/api/agents/chat/stream/' + encodeURIComponent(streamId);
  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  headers.host = 'librechat-api-ew3n.onrender.com';

  const proxyReq = https.request({ hostname: 'librechat-api-ew3n.onrender.com', path: url, method: 'GET', headers }, (proxyRes) => {
    const rh = {};
    for (const [k, v] of Object.entries(proxyRes.headers)) rh[k] = v;
    res.writeHead(proxyRes.statusCode, rh);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Backend unavailable'); });
  proxyReq.setTimeout(55000, () => { proxyReq.destroy(); if (!res.headersSent) res.writeHead(504); res.end('Backend timeout'); });
  proxyReq.end();
}
