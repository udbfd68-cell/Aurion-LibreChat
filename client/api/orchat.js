/**
 * orchat.js - Aurion agentic chat endpoint (Vercel serverless).
 *
 * Actions (via ?action=... query param):
 *   direct       POST  -> single-request SSE (stream back in same call)
 *   post         POST  -> enqueue conversation, return streamId for later stream
 *   stream       GET   -> SSE stream for a streamId produced by `post`
 *   abort        POST  -> ack (no persistent jobs)
 *   active       GET   -> active job list (always empty, we stream inline)
 *   status       GET   -> existence check for a conversation
 *   gen-title    GET   -> trivial title from first user message
 *   convo-detail GET   -> basic conversation metadata
 *   messages     GET   -> stored messages for a conversation
 *
 * Implementation notes:
 *   - Model resolution: `gemma4` (display) -> `gemma4:31b` (API call to Ollama).
 *   - Agentic tool-calling is merged INTO the stream: one streaming call per
 *     turn, tool_calls are accumulated from deltas, executed, then we loop.
 *     This removes the old non-streaming "pre-pass" that added ~4s of latency.
 *   - Reasoning (`delta.reasoning`) is intentionally NOT forwarded to the UI
 *     to avoid leaking chain-of-thought / "thinking" steps.
 */

import https from 'https';
import crypto from 'crypto';
import zlib from 'zlib';
import { callTool as mcpCallTool } from './mcp-client.js';
import * as realTools from './real-tools.js';

const DEFAULT_DISPLAY_MODEL = 'gemma4';
const DEFAULT_API_MODEL = 'gemma4:31b';
const DEFAULT_ENDPOINT = 'gemma4';
const STORE_TTL_MS = 30 * 60 * 1000;
const MAX_HISTORY = 40;
const MAX_TOOL_ITERATIONS = 6;
const OLLAMA_HOST = 'ollama.com';
const OLLAMA_PATH = '/v1/chat/completions';
const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

if (!global._orStore) global._orStore = new Map();

const MODEL_ALIAS = { gemma4: 'gemma4:31b' };

function resolveApiModel(m) {
  if (!m) return DEFAULT_API_MODEL;
  return MODEL_ALIAS[m] || m;
}

function resolveDisplayModel(m) {
  if (!m) return DEFAULT_DISPLAY_MODEL;
  const idx = m.indexOf(':');
  return idx > 0 ? m.substring(0, idx) : m;
}

function uuid() { return crypto.randomUUID(); }

function cleanStore() {
  const now = Date.now();
  for (const [k, v] of global._orStore) {
    if (now - v.ts > STORE_TTL_MS) global._orStore.delete(k);
  }
}

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

function encodeCtx(ctx) {
  try { return zlib.gzipSync(Buffer.from(JSON.stringify(ctx))).toString('base64url'); }
  catch { return null; }
}

function decodeCtx(s) {
  try { return JSON.parse(zlib.gunzipSync(Buffer.from(s, 'base64url')).toString()); }
  catch { return null; }
}

function sendSSE(res, data) {
  res.write('event: message\ndata: ' + JSON.stringify(data) + '\n\n');
  if (typeof res.flush === 'function') res.flush();
}

function sendSSEError(res, msg) {
  res.write('event: error\ndata: ' + JSON.stringify({ error: msg }) + '\n\n');
  if (typeof res.flush === 'function') res.flush();
}

function httpGetJson(host, path, timeoutMs) {
  return new Promise((resolve) => {
    const opts = {
      hostname: (host || 'client-gold-zeta.vercel.app').replace(/:\d+$/, ''),
      path, method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: timeoutMs || 8000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function fetchMcpToolIndex(host) {
  if (global._mcpToolIndex && Object.keys(global._mcpToolIndex).length > 0) {
    return global._mcpToolIndex;
  }
  const parsed = await httpGetJson(host, '/api/mcp/tools', 8000);
  if (!parsed) return {};
  const servers = parsed.servers || {};
  const idx = {};
  global._mcpServers = global._mcpServers || {};
  Object.keys(servers).forEach((key) => {
    const s = servers[key];
    global._mcpServers[key] = s;
    (s.tools || []).forEach((t) => {
      idx[t.name] = { serverName: key, sseUrl: s.url, realName: t.name };
      if (t.pluginKey) idx[t.pluginKey] = { serverName: key, sseUrl: s.url, realName: t.name };
    });
  });
  global._mcpToolIndex = idx;
  return idx;
}

async function fetchAllAgents(host) {
  const parsed = await httpGetJson(host, '/api/agents', 5000);
  if (!parsed) return null;
  const agents = Array.isArray(parsed) ? parsed : (parsed.data || parsed.agents || []);
  if (!Array.isArray(agents) || agents.length === 0) return null;
  global._agents = global._agents || [];
  agents.forEach((a) => {
    if (!global._agents.find((x) => x.id === a.id)) global._agents.push(a);
  });
  return agents;
}

async function fetchAgentConfig(agentId, host) {
  if (!agentId) return null;
  if (global._agents) {
    const cached = global._agents.find((a) => a.id === agentId);
    if (cached) return cached;
  }
  const all = await fetchAllAgents(host);
  return all ? all.find((a) => a.id === agentId) || null : null;
}

const BUILTIN_TOOLS = {
  web_search: { type: 'function', function: { name: 'web_search', description: 'Search the internet for current information. Use whenever the user asks about recent events, news, facts, or anything that requires up-to-date information.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query - be specific and include relevant keywords' } }, required: ['query'] } } },
  send_email: { type: 'function', function: { name: 'send_email', description: 'Send an email to one or more recipients with subject and HTML body.', parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] } } },
  read_email: { type: 'function', function: { name: 'read_email', description: 'Read emails from the configured IMAP mailbox. Can search by sender, subject, or filter unread/flagged emails.', parameters: { type: 'object', properties: { folder: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } } } } },
  execute_code: { type: 'function', function: { name: 'execute_code', description: 'Execute code in a sandboxed environment. Supports Python, JavaScript, TypeScript, Java, C, C++, Go, Rust, Ruby, PHP, Bash, Perl, Haskell, Lua, Swift, C#, Scala, Kotlin, R.', parameters: { type: 'object', properties: { language: { type: 'string' }, code: { type: 'string' } }, required: ['code'] } } },
  file_search: { type: 'function', function: { name: 'file_search', description: 'Search through uploaded documents using keyword matching.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  prospector: { type: 'function', function: { name: 'prospector', description: 'Find business leads, contacts, and decision-makers using multi-strategy web search.', parameters: { type: 'object', properties: { company: { type: 'string' }, role: { type: 'string' }, industry: { type: 'string' } } } } },
  calendar: { type: 'function', function: { name: 'calendar', description: 'Manage calendar events: create, list, update, delete, search, clear. Supports natural language dates.', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'update', 'delete', 'search', 'clear'] }, title: { type: 'string' }, date: { type: 'string' }, eventId: { type: 'string' } }, required: ['action'] } } },
  browser: { type: 'function', function: { name: 'browser', description: 'Lightweight HTTP fetch + text extraction of a single URL. Use web_browser for real browser interactions.', parameters: { type: 'object', properties: { url: { type: 'string' }, action: { type: 'string', enum: ['read', 'click', 'screenshot'] } }, required: ['url'] } } },
  web_browser: { type: 'function', function: { name: 'web_browser', description: 'REAL browser automation powered by Playwright + Chromium. For simple reads pass url + action=read. For multi-step pass actionsJson as a JSON-encoded array of steps like [{"type":"goto","url":"..."},{"type":"click","selector":"..."},{"type":"content"}]. Step types: goto, click, type, press, wait, content, snapshot, screenshot.', parameters: { type: 'object', properties: { url: { type: 'string' }, action: { type: 'string' }, actionsJson: { type: 'string' } } } } },
};

async function buildToolDefs(toolNames, host) {
  if (!toolNames || !toolNames.length) return [];
  const defs = [];
  await fetchMcpToolIndex(host);
  const toolIndex = global._mcpToolIndex || {};
  const mcpServers = global._mcpServers || {};

  toolNames.forEach((name) => {
    const key = typeof name === 'string' ? name : (name.name || name.type || '');
    if (!key) return;

    if (BUILTIN_TOOLS[key]) { defs.push(BUILTIN_TOOLS[key]); return; }

    const scanServer = (sName) => {
      const s = mcpServers[sName];
      if (!s || !s.tools) return null;
      const t = s.tools.find((tool) => tool.pluginKey === key || tool.name === key);
      return t ? { type: 'function', function: { name: t.name, description: t.description || '', parameters: t.inputSchema || { type: 'object', properties: {} } } } : null;
    };

    if (toolIndex[key]) {
      const def = scanServer(toolIndex[key].serverName);
      if (def) { defs.push(def); return; }
    }
    for (const sName of Object.keys(mcpServers)) {
      const def = scanServer(sName);
      if (def) { defs.push(def); return; }
    }

    defs.push({ type: 'function', function: { name: key, description: 'Execute ' + key, parameters: { type: 'object', properties: { input: { type: 'string' } } } } });
  });

  return defs;
}

async function executeTool(name, args, host) {
  await fetchMcpToolIndex(host);
  const mcpEntry = (global._mcpToolIndex || {})[name];

  if (mcpEntry && mcpEntry.sseUrl) {
    try {
      const result = await mcpCallTool(mcpEntry.sseUrl, mcpEntry.realName || name, args, 20000);
      if (result && result.content) {
        const textParts = result.content.filter((c) => c.type === 'text').map((c) => c.text);
        if (textParts.length) return textParts.join('\n');
        return JSON.stringify(result.content);
      }
      return JSON.stringify(result || { status: 'ok' });
    } catch (err) {
      return JSON.stringify({ error: 'MCP tool error: ' + (err.message || 'unknown'), tool: name });
    }
  }

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
    default: return JSON.stringify({ error: 'Unknown tool: ' + name });
  }
}

function streamOneTurn({ apiModel, apiMessages, toolDefs, temperature, maxTokens, onText }) {
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
  const useOpenRouter = !!OPENROUTER_KEY;
  const hostname = useOpenRouter ? OPENROUTER_HOST : OLLAMA_HOST;
  const path = useOpenRouter ? OPENROUTER_PATH : OLLAMA_PATH;
  const authKey = useOpenRouter ? OPENROUTER_KEY : OLLAMA_API_KEY;
  const extraHeaders = useOpenRouter
    ? { 'HTTP-Referer': 'https://client-gold-zeta.vercel.app', 'X-Title': 'Aurion Chat' }
    : {};

  const payload = {
    model: apiModel,
    messages: apiMessages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
  };
  if (toolDefs && toolDefs.length) payload.tools = toolDefs;
  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    const state = { text: '', toolCallsByIdx: {}, finishReason: null, error: null };

    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authKey,
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders,
      },
    }, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errBody = '';
        apiRes.on('data', (c) => (errBody += c));
        apiRes.on('end', () => {
          state.error = 'Aurion error ' + apiRes.statusCode + ': ' + errBody.substring(0, 500);
          resolve(state);
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
          if (!trimmed.startsWith('data: ')) continue;
          const payloadStr = trimmed.substring(6);
          if (payloadStr === '[DONE]') continue;
          let parsed;
          try { parsed = JSON.parse(payloadStr); } catch { continue; }
          const choice = parsed.choices && parsed.choices[0];
          if (!choice) continue;
          if (choice.finish_reason) state.finishReason = choice.finish_reason;
          const delta = choice.delta || {};
          if (delta.content) {
            state.text += delta.content;
            try { onText && onText(delta.content); } catch { /* ignore */ }
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index != null ? tc.index : 0;
              const slot = state.toolCallsByIdx[idx] || { id: '', name: '', arguments: '' };
              if (tc.id) slot.id = tc.id;
              if (tc.function) {
                if (tc.function.name) slot.name = tc.function.name;
                if (tc.function.arguments) slot.arguments += tc.function.arguments;
              }
              state.toolCallsByIdx[idx] = slot;
            }
          }
        }
      });
      apiRes.on('end', () => resolve(state));
      apiRes.on('error', (err) => { state.error = 'Stream error: ' + (err.message || 'unknown'); resolve(state); });
    });

    req.on('error', (err) => { state.error = 'Request error: ' + (err.message || 'unknown'); resolve(state); });
    req.setTimeout(120000, () => { req.destroy(); if (!state.error) state.error = 'Upstream timeout'; resolve(state); });
    req.write(body);
    req.end();
  });
}

function toolCallsArray(slot) {
  return Object.keys(slot).sort((a, b) => Number(a) - Number(b)).map((k) => {
    const tc = slot[k];
    return {
      id: tc.id || ('call_' + Math.random().toString(36).slice(2, 10)),
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments || '{}' },
    };
  });
}

async function runAgenticStream({ res, ctx, host }) {
  const apiModel = resolveApiModel(ctx.model);
  const displayModel = resolveDisplayModel(ctx.model);
  const endpointName = ctx.endpoint || DEFAULT_ENDPOINT;

  const responseMessageId = uuid();
  const stepId = uuid();
  let toolContentIndex = 0;
  const toolCallParts = [];

  sendSSE(res, {
    created: true,
    message: {
      messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId,
      conversationId: ctx.conversationId, text: ctx.text || '',
      isCreatedByUser: true, sender: 'User',
    },
    streamId: ctx.conversationId,
  });

  const apiMessages = [];
  if (ctx.agentInstructions) apiMessages.push({ role: 'system', content: ctx.agentInstructions });
  apiMessages.push(...ctx.messages);

  const toolDefs = await buildToolDefs(ctx.agentTools, host);

  sendSSE(res, {
    event: 'on_run_step',
    data: {
      type: 'message_creation', id: stepId, runId: responseMessageId,
      index: toolContentIndex,
      stepDetails: { type: 'message_creation', message_creation: { message_id: responseMessageId } },
      usage: null,
    },
  });

  let fullText = '';
  let lastError = null;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const onText = (chunk) => {
      fullText += chunk;
      sendSSE(res, {
        event: 'on_message_delta',
        data: { id: stepId, delta: { content: [{ index: toolContentIndex, type: 'text', text: chunk }] } },
      });
    };

    const turn = await streamOneTurn({
      apiModel, apiMessages, toolDefs,
      temperature: ctx.temperature, maxTokens: ctx.maxTokens,
      onText,
    });

    if (turn.error) { lastError = turn.error; break; }

    const toolCalls = toolCallsArray(turn.toolCallsByIdx);
    const finish = turn.finishReason || (toolCalls.length ? 'tool_calls' : 'stop');

    if (!toolCalls.length || finish !== 'tool_calls') break;

    apiMessages.push({
      role: 'assistant',
      content: turn.text || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      // Allocate a fresh content index for this tool call so the UI does not
      // mix it with the preceding text chunk at the same index.
      toolContentIndex++;
      const toolIdx = toolContentIndex;
      const toolStepId = uuid();
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* tolerate */ }

      sendSSE(res, {
        event: 'on_run_step',
        data: {
          id: toolStepId, runId: responseMessageId, index: toolIdx,
          type: 'tool_calls',
          stepDetails: { type: 'tool_calls', tool_calls: [{ id: tc.id, name: tc.function.name, args: tc.function.arguments, type: 'tool_call' }] },
          usage: null,
        },
      });

      const toolOutput = await executeTool(tc.function.name, args, host);

      sendSSE(res, {
        event: 'on_run_step_completed',
        data: { result: { id: toolStepId, index: toolIdx, tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 } } },
      });

      toolCallParts.push({
        type: 'tool_call',
        tool_call: { id: tc.id, name: tc.function.name, args: tc.function.arguments, output: toolOutput, type: 'tool_call', progress: 1 },
      });
      apiMessages.push({ role: 'tool', tool_call_id: tc.id, content: toolOutput });
    }
    // Allocate a new index for the next text chunk.
    toolContentIndex++;
  }

  if (lastError && !fullText) {
    sendSSEError(res, lastError);
    return res.end();
  }

  const contentParts = [...toolCallParts, { type: 'text', text: { value: fullText } }];
  const firstUserMsg = ctx.messages.find((m) => m.role === 'user');
  const title = firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat';

  sendSSE(res, {
    final: true,
    conversation: {
      conversationId: ctx.conversationId, title,
      endpoint: endpointName, model: displayModel,
      chatGptLabel: null, promptPrefix: null,
      temperature: ctx.temperature, maxOutputTokens: ctx.maxTokens,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    title,
    requestMessage: {
      messageId: ctx.userMessageId, parentMessageId: ctx.parentMessageId,
      conversationId: ctx.conversationId, text: ctx.text || '',
      isCreatedByUser: true, sender: 'User',
      endpoint: endpointName, model: displayModel,
    },
    responseMessage: {
      messageId: responseMessageId, parentMessageId: ctx.userMessageId,
      conversationId: ctx.conversationId,
      content: contentParts, text: fullText,
      sender: displayModel, endpoint: endpointName, model: displayModel,
      isCreatedByUser: false, unfinished: !!lastError,
    },
  });

  const updatedMsgs = [...ctx.messages, { role: 'assistant', content: fullText }];
  if (updatedMsgs.length > MAX_HISTORY) updatedMsgs.splice(0, updatedMsgs.length - MAX_HISTORY);
  global._orStore.set(ctx.conversationId, { ...ctx, messages: updatedMsgs, ts: Date.now() });

  return res.end();
}

async function extractContext(req) {
  const body = req.body || {};
  const incomingModel = body.model_parameters?.model || body.model || body.agentOption?.model || DEFAULT_DISPLAY_MODEL;
  const text = body.text || body.editedContent || '';
  const userMessageId = body.messageId || uuid();
  const parentMessageId = body.parentMessageId || '00000000-0000-0000-0000-000000000000';
  const incomingConvoId = body.conversationId;
  const temperature = body.model_parameters?.temperature ?? body.temperature ?? 0.7;
  const maxTokens = body.model_parameters?.maxOutputTokens ?? body.max_tokens ?? 4096;
  const endpoint = body.endpoint || DEFAULT_ENDPOINT;

  const host = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';

  const agentId = body.agent_id || body.agentOption?.agent_id || '';
  let agentInstructions = body.instructions || body.agentOption?.instructions || '';
  let agentName = '';
  let agentTools = body.tools || [];
  let resolvedModel = incomingModel;

  if (agentId) {
    let agent = global._agents && global._agents.find((a) => a.id === agentId);
    if (!agent) agent = await fetchAgentConfig(agentId, host);
    if (agent) {
      if (!agentInstructions) agentInstructions = agent.instructions || '';
      agentName = agent.name || '';
      if (agent.model) resolvedModel = agent.model;
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
    if (ck) {
      const ctxDecoded = decodeCtx(ck);
      if (ctxDecoded && ctxDecoded.cid === conversationId && ctxDecoded.msgs) messages = ctxDecoded.msgs;
    }
  }
  if (text) messages.push({ role: 'user', content: text });
  if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);

  const ctx = {
    model: resolvedModel,
    messages, userMessageId, parentMessageId, conversationId,
    temperature, maxTokens, text,
    ts: Date.now(),
    agentInstructions, agentId, agentName, agentTools,
    endpoint,
  };
  global._orStore.set(conversationId, ctx);
  return { ctx, host };
}

function ensureKeys(res) {
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  if (!OLLAMA_API_KEY && !OPENROUTER_KEY) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    sendSSEError(res, 'Aurion API key not configured');
    res.end();
    return false;
  }
  return true;
}

function openSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Content-Encoding': 'identity',
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  const streamId = req.query.id || '';

  if (action === 'direct' && req.method === 'POST') {
    const { ctx, host } = await extractContext(req);
    if (!ensureKeys(res)) return;
    openSSE(res);
    return runAgenticStream({ res, ctx, host });
  }

  if (action === 'post' && req.method === 'POST') {
    const { ctx } = await extractContext(req);

    const ck = encodeCtx({ cid: ctx.conversationId, model: ctx.model, msgs: ctx.messages, t: ctx.temperature, mx: ctx.maxTokens, aid: ctx.agentId });
    if (ck && ck.length < 3800) {
      res.setHeader('Set-Cookie', '_or_ctx=' + ck + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600');
    }

    const encoded = encodeCtx({ cid: ctx.conversationId, model: ctx.model, msgs: ctx.messages, t: ctx.temperature, mx: ctx.maxTokens, aid: ctx.agentId });
    const encodedStreamId = encoded ? ctx.conversationId + '.' + encoded : ctx.conversationId;

    return res.status(200).json({ streamId: encodedStreamId, conversationId: ctx.conversationId, status: 'started' });
  }

  if (action === 'stream' && req.method === 'GET') {
    cleanStore();

    let realStreamId = streamId;
    let embeddedCtx = null;
    const dotIdx = streamId.indexOf('.');
    if (dotIdx > 0) {
      realStreamId = streamId.substring(0, dotIdx);
      embeddedCtx = decodeCtx(streamId.substring(dotIdx + 1));
    }

    let ctx = global._orStore.get(realStreamId);

    if (!ctx && embeddedCtx && embeddedCtx.cid) {
      ctx = {
        model: embeddedCtx.model,
        messages: embeddedCtx.msgs || [],
        temperature: embeddedCtx.t || 0.7,
        maxTokens: embeddedCtx.mx || 4096,
        userMessageId: uuid(),
        parentMessageId: '00000000-0000-0000-0000-000000000000',
        conversationId: embeddedCtx.cid,
        text: embeddedCtx.msgs?.[embeddedCtx.msgs.length - 1]?.content || '',
        ts: Date.now(),
        agentId: embeddedCtx.aid || '',
        endpoint: DEFAULT_ENDPOINT,
      };
    }

    if (!ctx) {
      const ck = getCookie(req, '_or_ctx');
      if (ck) {
        const decoded = decodeCtx(ck);
        if (decoded && (decoded.cid === realStreamId || decoded.cid === streamId)) {
          ctx = {
            model: decoded.model,
            messages: decoded.msgs,
            temperature: decoded.t || 0.7,
            maxTokens: decoded.mx || 4096,
            userMessageId: uuid(),
            parentMessageId: '00000000-0000-0000-0000-000000000000',
            conversationId: decoded.cid,
            text: decoded.msgs?.[decoded.msgs.length - 1]?.content || '',
            ts: Date.now(),
            agentId: decoded.aid || '',
            endpoint: DEFAULT_ENDPOINT,
          };
        }
      }
    }

    if (!ctx) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' });
      sendSSEError(res, 'Stream context not found. Please try sending your message again.');
      sendSSE(res, {
        final: true,
        conversation: { conversationId: realStreamId, title: 'Error', endpoint: DEFAULT_ENDPOINT },
        responseMessage: {
          messageId: uuid(), conversationId: realStreamId,
          text: 'Stream context not found. Please try sending your message again.',
          content: [{ type: 'text', text: { value: 'Stream context not found. Please try sending your message again.' } }],
          isCreatedByUser: false, sender: 'System', unfinished: true,
        },
      });
      return res.end();
    }

    const host = req.headers.host || req.headers['x-forwarded-host'] || 'client-gold-zeta.vercel.app';

    if (!ctx.agentId) {
      const referer = req.headers.referer || '';
      const aidMatch = referer.match(/agent_id=([^&]+)/);
      if (aidMatch) ctx.agentId = aidMatch[1];
    }
    if (!ctx.agentId && req.query.agent_id) ctx.agentId = req.query.agent_id;
    if ((!ctx.agentTools || !ctx.agentTools.length) && ctx.agentId) {
      const agent = await fetchAgentConfig(ctx.agentId, host);
      if (agent) {
        ctx.agentTools = agent.tools || [];
        if (!ctx.agentInstructions && agent.instructions) ctx.agentInstructions = agent.instructions;
        if (agent.model) ctx.model = agent.model;
      }
    }
    if ((!ctx.agentTools || !ctx.agentTools.length) && !ctx.agentId) {
      const all = await fetchAllAgents(host);
      if (all && all.length === 1) {
        const agent = all[0];
        ctx.agentId = agent.id;
        ctx.agentTools = agent.tools || [];
        if (!ctx.agentInstructions && agent.instructions) ctx.agentInstructions = agent.instructions;
        if (agent.model) ctx.model = agent.model;
      }
    }

    if (!ensureKeys(res)) return;
    openSSE(res);
    return runAgenticStream({ res, ctx, host });
  }

  if (action === 'abort' && req.method === 'POST') {
    return res.status(200).json({ success: true });
  }

  if (action === 'active' && req.method === 'GET') {
    return res.status(200).json({ activeJobIds: [] });
  }

  if (action === 'status' && req.method === 'GET') {
    const id = streamId.indexOf('.') > 0 ? streamId.substring(0, streamId.indexOf('.')) : streamId;
    const stored = global._orStore.get(id);
    return res.status(200).json({ active: !!stored, streamId: id, status: stored ? 'processing' : 'completed' });
  }

  if (action === 'gen-title') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    const firstMsg = ctx?.messages?.find((m) => m.role === 'user');
    return res.status(200).json({ title: firstMsg ? firstMsg.content.substring(0, 60) : 'New Chat' });
  }

  if (action === 'convo-detail') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    if (!ctx) {
      return res.status(200).json({
        conversationId: convoId, title: 'New Chat',
        endpoint: DEFAULT_ENDPOINT, model: DEFAULT_DISPLAY_MODEL,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    const firstUserMsg = ctx.messages?.find((m) => m.role === 'user');
    return res.status(200).json({
      conversationId: convoId,
      title: firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat',
      endpoint: ctx.endpoint || DEFAULT_ENDPOINT,
      model: resolveDisplayModel(ctx.model),
      temperature: ctx.temperature || 0.7,
      maxOutputTokens: ctx.maxTokens || 4096,
      createdAt: new Date(ctx.ts || Date.now()).toISOString(),
      updatedAt: new Date(ctx.ts || Date.now()).toISOString(),
    });
  }

  if (action === 'messages') {
    const convoId = req.query.convoId || '';
    cleanStore();
    const ctx = global._orStore.get(convoId);
    if (!ctx || !ctx.messages) return res.status(200).json([]);

    const now = new Date().toISOString();
    const result = [];
    let prevMsgId = '00000000-0000-0000-0000-000000000000';
    const displayModel = resolveDisplayModel(ctx.model);

    for (let i = 0; i < ctx.messages.length; i++) {
      const m = ctx.messages[i];
      const msgId = (m.role === 'user' && i === 0 && ctx.userMessageId) ? ctx.userMessageId : uuid();
      result.push({
        messageId: msgId,
        conversationId: convoId,
        parentMessageId: prevMsgId,
        text: m.content || '',
        isCreatedByUser: m.role === 'user',
        sender: m.role === 'user' ? 'User' : displayModel,
        model: m.role !== 'user' ? displayModel : undefined,
        endpoint: ctx.endpoint || DEFAULT_ENDPOINT,
        error: false, unfinished: false,
        createdAt: now, updatedAt: now,
      });
      prevMsgId = msgId;
    }
    return res.status(200).json(result);
  }

  return res.status(200).json({ ok: true });
}
/**
 * orchat.js â€” Aurion agentic chat endpoint (Vercel serverless).
 *
 * Actions (via ?action=â€¦ query param):
 *   direct       POST  â†’ single-request SSE (stream back in same call)
 *   post         POST  â†’ enqueue conversation, return streamId for later stream
 *   stream       GET   â†’ SSE stream for a streamId produced by `post`
 *   abort        POST  â†’ ack (no persistent jobs)
 *   active       GET   â†’ active job list (always empty, we stream inline)
 *   status       GET   â†’ existence check for a conversation
 *   gen-title    GET   â†’ trivial title from first user message
 *   convo-detail GET   â†’ basic conversation metadata
 *   messages     GET   â†’ stored messages for a conversation
 *
 * Implementation notes:
 *   - Model resolution: `gemma4` (display) â†” `gemma4:31b` (API call to Ollama).
 *   - Agentic tool-calling is merged INTO the stream: one streaming call per
 *     turn, tool_calls are accumulated from deltas, executed, then we loop.
 *     This removes the old non-streaming "pre-pass" that added ~4s of latency.
 *   - Reasoning (`delta.reasoning`) is intentionally NOT forwarded to the UI
 *     to avoid leaking chain-of-thought / "thinking" steps.
 */