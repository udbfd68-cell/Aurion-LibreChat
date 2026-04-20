const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');

// ─── Persistent in-memory store (survives warm invocations) ───
if (!global._orStore) {
  global._orStore = new Map();
}

// Clean stale entries (>30 min)
function cleanStore() {
  const now = Date.now();
  for (const [key, value] of global._orStore) {
    if (now - value.ts > 30 * 60 * 1000) global._orStore.delete(key);
  }
}

// ─── Helpers ───
function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? match[1] : null;
}

function uuid() {
  return crypto.randomUUID();
}

function sendSSE(res, data) {
  res.write('event: message\ndata: ' + JSON.stringify(data) + '\n\n');
}

function sendSSEError(res, msg) {
  res.write('event: error\ndata: ' + JSON.stringify({ error: msg }) + '\n\n');
}

function proxyToRender(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || '';
  const url = '/api/agents/chat/' + path;
  const isSSE = req.method === 'GET' && path.startsWith('stream/');

  const headers = {};
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  headers.host = 'librechat-api-ew3n.onrender.com';

  const options = {
    hostname: 'librechat-api-ew3n.onrender.com',
    path: url,
    method: req.method,
    headers: headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Forward all headers
    const resHeaders = {};
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      resHeaders[key] = value;
    }
    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  });

  proxyReq.setTimeout(55000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Backend timeout' }));
  });

  if (req.method === 'POST' && req.body) {
    proxyReq.write(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  proxyReq.end();
}

// ─── Encode/decode conversation context for cookie backup ───
function encodeContext(ctx) {
  try {
    const json = JSON.stringify(ctx);
    const compressed = zlib.gzipSync(Buffer.from(json));
    return compressed.toString('base64url');
  } catch { return null; }
}

function decodeContext(encoded) {
  try {
    const compressed = Buffer.from(encoded, 'base64url');
    const json = zlib.gunzipSync(compressed).toString();
    return JSON.parse(json);
  } catch { return null; }
}

// ─── POST /api/agents/chat/Aurion — Start chat ───
async function handleChatPost(req, res) {
  const body = req.body || {};
  const model = body.model_parameters?.model || body.model || body.agentOption?.model || 'anthropic/claude-sonnet-4';
  const text = body.text || body.editedContent || '';
  const userMessageId = body.messageId || uuid();
  const parentMessageId = body.parentMessageId || '00000000-0000-0000-0000-000000000000';
  const incomingConvoId = body.conversationId;
  const temperature = body.model_parameters?.temperature ?? body.temperature ?? 0.7;
  const maxTokens = body.model_parameters?.maxOutputTokens ?? body.max_tokens ?? 4096;

  // Determine conversationId
  const conversationId = (incomingConvoId && incomingConvoId !== 'new') ? incomingConvoId : uuid();

  // Retrieve existing conversation history
  let messages = [];
  cleanStore();

  // 1) Try global store (warm function)
  const stored = global._orStore.get(conversationId);
  if (stored && stored.messages) {
    messages = stored.messages;
  }

  // 2) Fallback: try cookie
  if (messages.length === 0) {
    const ctxCookie = getCookie(req, '_or_ctx');
    if (ctxCookie) {
      const ctx = decodeContext(ctxCookie);
      if (ctx && ctx.cid === conversationId && ctx.msgs) {
        messages = ctx.msgs;
      }
    }
  }

  // Add new user message
  if (text) {
    messages.push({ role: 'user', content: text });
  }

  // Truncate to last 40 messages to stay within cookie limits
  if (messages.length > 40) {
    messages = messages.slice(-40);
  }

  // Store in global map
  const storeEntry = {
    model,
    messages,
    userMessageId,
    parentMessageId,
    conversationId,
    temperature,
    maxTokens,
    text,
    ts: Date.now(),
  };
  global._orStore.set(conversationId, storeEntry);

  // Also set cookie backup (compact format)
  const cookieCtx = { cid: conversationId, model, msgs: messages, t: temperature, mx: maxTokens };
  const encoded = encodeContext(cookieCtx);
  if (encoded && encoded.length < 3800) {
    res.setHeader('Set-Cookie', '_or_ctx=' + encoded + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600');
  }

  return res.status(200).json({
    streamId: conversationId,
    conversationId: conversationId,
    status: 'started',
  });
}

// ─── GET /api/agents/chat/stream/:id — SSE stream ───
async function handleStream(req, res, streamId) {
  cleanStore();

  // Try to get context from global store
  let ctx = global._orStore.get(streamId);

  // Fallback: try cookie
  if (!ctx) {
    const ctxCookie = getCookie(req, '_or_ctx');
    if (ctxCookie) {
      const decoded = decodeContext(ctxCookie);
      if (decoded && decoded.cid === streamId) {
        ctx = {
          model: decoded.model,
          messages: decoded.msgs,
          temperature: decoded.t || 0.7,
          maxTokens: decoded.mx || 4096,
          userMessageId: uuid(),
          parentMessageId: '00000000-0000-0000-0000-000000000000',
          conversationId: streamId,
          text: decoded.msgs?.[decoded.msgs.length - 1]?.content || '',
          ts: Date.now(),
        };
      }
    }
  }

  // If still no context, this isn't our stream — proxy to Render
  if (!ctx) {
    return proxyToRender(req, res);
  }

  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  if (!OPENROUTER_KEY) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    sendSSEError(res, 'Aurion API key not configured');
    res.end();
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Content-Encoding': 'identity',
  });

  const responseMessageId = uuid();

  // 1) Send CREATED event
  sendSSE(res, {
    created: true,
    message: {
      messageId: ctx.userMessageId,
      parentMessageId: ctx.parentMessageId,
      conversationId: ctx.conversationId,
      text: ctx.text || '',
      isCreatedByUser: true,
      sender: 'User',
    },
    streamId: ctx.conversationId,
  });

  // 2) Call Aurion API with streaming
  const requestBody = JSON.stringify({
    model: ctx.model,
    messages: ctx.messages,
    stream: true,
    temperature: ctx.temperature,
    max_tokens: ctx.maxTokens,
  });

  let fullText = '';
  let reasoningText = '';
  let streamError = null;

  await new Promise((resolve) => {
    const apiReq = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'HTTP-Referer': 'https://client-gold-zeta.vercel.app',
        'X-Title': 'Aurion Chat',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errBody = '';
        apiRes.on('data', (c) => (errBody += c));
        apiRes.on('end', () => {
          streamError = 'Aurion error ' + apiRes.statusCode + ': ' + errBody.substring(0, 200);
          sendSSEError(res, streamError);
          res.end();
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

            // Handle reasoning/thinking tokens
            if (delta?.reasoning) {
              reasoningText += delta.reasoning;
              sendSSE(res, {
                event: 'on_message_delta',
                data: {
                  id: responseMessageId,
                  delta: {
                    content: [{
                      index: 0,
                      type: 'think',
                      think: { value: delta.reasoning },
                    }],
                  },
                },
              });
            }

            // Handle content tokens
            if (delta?.content) {
              fullText += delta.content;
              sendSSE(res, {
                type: 'text',
                messageId: responseMessageId,
                conversationId: ctx.conversationId,
                userMessageId: ctx.userMessageId,
                thread_id: ctx.conversationId,
                index: 0,
                text: { value: delta.content },
                stream: true,
              });
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      });

      apiRes.on('end', () => {
        resolve();
      });

      apiRes.on('error', (err) => {
        streamError = 'Stream error: ' + (err.message || 'unknown');
        resolve();
      });
    });

    apiReq.on('error', (err) => {
      streamError = 'Request error: ' + (err.message || 'unknown');
      resolve();
    });

    apiReq.setTimeout(55000, () => {
      apiReq.destroy();
      streamError = 'Aurion request timeout';
      resolve();
    });

    apiReq.write(requestBody);
    apiReq.end();
  });

  if (streamError && !fullText) {
    sendSSEError(res, streamError);
    res.end();
    return;
  }

  // Build content array for response
  const contentParts = [];
  if (reasoningText) {
    contentParts.push({ type: 'think', think: { value: reasoningText } });
  }
  contentParts.push({ type: 'text', text: { value: fullText } });

  // Generate a title from the first user message
  const firstUserMsg = ctx.messages.find((m) => m.role === 'user');
  const title = firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat';

  // 3) Send FINAL event
  sendSSE(res, {
    final: true,
    conversation: {
      conversationId: ctx.conversationId,
      title: title,
      endpoint: 'Aurion',
      model: ctx.model,
      chatGptLabel: null,
      promptPrefix: null,
      temperature: ctx.temperature,
      maxOutputTokens: ctx.maxTokens,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    title: title,
    requestMessage: {
      messageId: ctx.userMessageId,
      parentMessageId: ctx.parentMessageId,
      conversationId: ctx.conversationId,
      text: ctx.text || '',
      isCreatedByUser: true,
      sender: 'User',
      endpoint: 'Aurion',
      model: ctx.model,
    },
    responseMessage: {
      messageId: responseMessageId,
      parentMessageId: ctx.userMessageId,
      conversationId: ctx.conversationId,
      content: contentParts,
      text: fullText,
      sender: ctx.model,
      endpoint: 'Aurion',
      model: ctx.model,
      isCreatedByUser: false,
      unfinished: !!streamError,
    },
  });

  // 4) Update global store with assistant response for multi-turn
  const updatedMessages = [...ctx.messages, { role: 'assistant', content: fullText }];
  if (updatedMessages.length > 40) updatedMessages.splice(0, updatedMessages.length - 40);

  global._orStore.set(ctx.conversationId, {
    ...ctx,
    messages: updatedMessages,
    ts: Date.now(),
  });

  res.end();
}

// ─── POST /api/agents/chat/abort ───
function handleAbort(req, res) {
  const body = req.body || {};
  const streamId = body.streamId || body.conversationId;
  // Clean up stored context
  if (streamId && global._orStore.has(streamId)) {
    // Just acknowledge — the Aurion request will complete on its own
    return res.status(200).json({ success: true });
  }
  // Proxy to Render for non-Aurion aborts
  return proxyToRender(req, res);
}

// ─── GET /api/agents/chat/active ───
function handleActive(req, res) {
  return res.status(200).json({ activeJobIds: [] });
}

// ─── GET /api/agents/chat/status/:id ───
function handleStatus(req, res, conversationId) {
  const stored = global._orStore.get(conversationId);
  return res.status(200).json({
    active: !!stored,
    streamId: conversationId,
    status: stored ? 'processing' : 'completed',
  });
}

// ─── Main Router ───
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path || ''];

  // POST /api/agents/chat/Aurion
  if (req.method === 'POST' && pathSegments[0] === 'Aurion') {
    return handleChatPost(req, res);
  }

  // GET /api/agents/chat/stream/:id
  if (req.method === 'GET' && pathSegments[0] === 'stream' && pathSegments[1]) {
    return handleStream(req, res, pathSegments[1]);
  }

  // POST /api/agents/chat/abort
  if (req.method === 'POST' && pathSegments[0] === 'abort') {
    return handleAbort(req, res);
  }

  // GET /api/agents/chat/active
  if (req.method === 'GET' && pathSegments[0] === 'active') {
    return handleActive(req, res);
  }

  // GET /api/agents/chat/status/:id
  if (req.method === 'GET' && pathSegments[0] === 'status' && pathSegments[1]) {
    return handleStatus(req, res, pathSegments[1]);
  }

  // Everything else → proxy to Render
  return proxyToRender(req, res);
};
