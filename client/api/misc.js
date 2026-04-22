import crypto from 'crypto';
import { discoverTools } from './mcp-client.js';
import * as realTools from './real-tools.js';

/* ── In-memory stores ── */
if (!global._projects) global._projects = [];
if (!global._mcpServers) global._mcpServers = {};
if (!global._mcpConnected) global._mcpConnected = {};
if (!global._mcpToolIndex) global._mcpToolIndex = {}; // toolName → { serverName, sseUrl }

function uuid() { return crypto.randomUUID(); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const type = req.query.type || '';
  const id = req.query.id || '';
  const name = req.query.name || '';

  /* ═══════════════════════════════════
     PROJECTS
     ═══════════════════════════════════ */
  if (type === 'projects') {
    if (req.method === 'GET') {
      return res.status(200).json(global._projects);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const project = {
        _id: uuid(),
        userId: 'user_aurion',
        name: b.name || 'New Project',
        description: b.description || '',
        customInstructions: b.customInstructions || '',
        knowledgeFileIds: b.knowledgeFileIds || [],
        color: b.color || '#3B82F6',
        icon: b.icon || '📁',
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      global._projects.push(project);
      return res.status(201).json(project);
    }
  }

  if (type === 'project' && id) {
    const idx = global._projects.findIndex(p => p._id === id);
    if (req.method === 'GET') {
      return idx >= 0 ? res.status(200).json(global._projects[idx]) : res.status(404).json({ error: 'Not found' });
    }
    if (['PUT', 'PATCH'].includes(req.method) && idx >= 0) {
      global._projects[idx] = { ...global._projects[idx], ...(req.body || {}), updatedAt: new Date().toISOString() };
      return res.status(200).json(global._projects[idx]);
    }
    if (req.method === 'DELETE' && idx >= 0) {
      global._projects.splice(idx, 1);
      return res.status(200).json({ success: true });
    }
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
  }

  /* ═══════════════════════════════════
     SKILLS
     ═══════════════════════════════════ */
  if (type === 'skills') {
    if (req.method === 'GET') return res.status(200).json([]);
    if (req.method === 'POST') {
      return res.status(201).json({ _id: uuid(), ...(req.body || {}), createdAt: new Date().toISOString() });
    }
  }

  /* ═══════════════════════════════════
     TOOL TEST — Direct tool execution for debugging
     ═══════════════════════════════════ */
  if (type === 'tool-test' && req.method === 'GET') {
    return res.status(200).json({ status: 'ok', tools: ['web_search','execute_code','browser','send_email','calendar','prospector','file_search'] });
  }

  if (type === 'tool-test' && req.method === 'POST') {
    const b = req.body || {};
    const toolName = b.tool || '';
    const args = b.args || {};
    try {
      let result;
      switch (toolName) {
        case 'web_search': result = await realTools.webSearch(args.query); break;
        case 'browser': result = await realTools.browser(args.url, args.action); break;
        case 'execute_code': result = await realTools.executeCode(args.language, args.code); break;
        case 'send_email': result = await realTools.sendEmail(args.to, args.subject, args.body); break;
        case 'read_email': result = await realTools.readEmail(args.folder, args.search, args.limit); break;
        case 'calendar': result = await realTools.calendar(args.action, args.title, args.date, args.eventId); break;
        case 'prospector': result = await realTools.prospector(args.company, args.role, args.industry); break;
        case 'file_search': result = await realTools.fileSearch(args.query); break;
        default: result = JSON.stringify({ error: 'Unknown tool: ' + toolName });
      }
      return res.status(200).json(JSON.parse(result));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ═══════════════════════════════════
     ACTIONS (Agent Skills)
     ═══════════════════════════════════ */
  if (type === 'actions') {
    return res.status(200).json([]);
  }

  /* ═══════════════════════════════════
     MCP SERVERS — REAL SSE CONNECTIONS
     ═══════════════════════════════════ */
  if (type === 'mcp-servers') {
    if (req.method === 'GET') {
      return res.status(200).json(global._mcpServers);
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const config = b.config || b;
      const serverName = config.serverName || config.title || ('mcp_' + uuid().substring(0, 8));
      const sseUrl = config.url || '';

      if (!sseUrl) {
        return res.status(400).json({ error: 'Missing MCP server URL' });
      }

      // Create initial server entry (connecting state)
      const server = {
        dbId: uuid(),
        serverName: serverName,
        title: config.title || serverName,
        description: config.description || '',
        url: sseUrl,
        type: config.type || 'sse',
        iconPath: config.iconPath || '',
        tools: [],
        consumeOnly: false,
      };
      global._mcpServers[serverName] = server;
      global._mcpConnected[serverName] = { requiresOAuth: false, connectionState: 'connecting' };

      // REAL CONNECTION: Connect to MCP SSE server and discover tools
      try {
        const result = await discoverTools(sseUrl, 12000);
        const mcpTools = (result.tools || []).map(function (t) {
          return {
            name: t.name,
            pluginKey: serverName + '_' + t.name,
            description: t.description || '',
            inputSchema: t.inputSchema || { type: 'object', properties: {} },
          };
        });

        server.tools = mcpTools;
        global._mcpServers[serverName] = server;
        global._mcpConnected[serverName] = { requiresOAuth: false, connectionState: 'connected' };

        // Build reverse tool index: toolName → { serverName, sseUrl }
        mcpTools.forEach(function (t) {
          global._mcpToolIndex[t.name] = { serverName: serverName, sseUrl: sseUrl };
          global._mcpToolIndex[t.pluginKey] = { serverName: serverName, sseUrl: sseUrl, realName: t.name };
        });

        return res.status(201).json(server);
      } catch (err) {
        // Connection failed — store error state but still return the server
        server.tools = [];
        global._mcpServers[serverName] = server;
        global._mcpConnected[serverName] = {
          requiresOAuth: (err.message || '').indexOf('401') !== -1 || (err.message || '').indexOf('auth') !== -1,
          connectionState: 'error',
          error: err.message || 'Connection failed',
        };
        return res.status(201).json(server);
      }
    }
  }

  if (type === 'mcp-server' && name) {
    if (req.method === 'GET') {
      return global._mcpServers[name]
        ? res.status(200).json(global._mcpServers[name])
        : res.status(404).json({ error: 'Server not found' });
    }
    if (req.method === 'PATCH') {
      if (global._mcpServers[name]) {
        global._mcpServers[name] = { ...global._mcpServers[name], ...(req.body || {}) };
        return res.status(200).json(global._mcpServers[name]);
      }
      return res.status(404).json({ error: 'Server not found' });
    }
    if (req.method === 'DELETE') {
      delete global._mcpServers[name];
      delete global._mcpConnected[name];
      return res.status(200).json({ success: true });
    }
  }

  /* ═══════════════════════════════════
     MCP TOOLS — REAL from connected servers
     ═══════════════════════════════════ */
  if (type === 'mcp-tools') {
    const servers = {};
    Object.keys(global._mcpServers).forEach(function (key) {
      const s = global._mcpServers[key];
      if (s.tools && s.tools.length > 0) {
        servers[key] = {
          name: s.title || s.serverName || key,
          url: s.url || '',
          icon: s.iconPath || '',
          authenticated: true,
          authConfig: [],
          tools: s.tools.map(function (t) {
            return { name: t.name, pluginKey: t.pluginKey || (key + '_' + t.name), description: t.description || '', inputSchema: t.inputSchema || null };
          }),
        };
      }
    });
    return res.status(200).json({ servers: servers });
  }

  /* ═══════════════════════════════════
     MCP CONNECTION STATUS — REAL states
     ═══════════════════════════════════ */
  if (type === 'mcp-status') {
    if (name) {
      const s = global._mcpConnected[name] || { requiresOAuth: false, connectionState: 'disconnected' };
      return res.status(200).json(s);
    }
    // Return all statuses in the format the frontend expects
    const connectionStatus = {};
    Object.keys(global._mcpConnected).forEach(function (key) {
      connectionStatus[key] = global._mcpConnected[key];
    });
    return res.status(200).json({ success: true, connectionStatus: connectionStatus });
  }

  /* ═══════════════════════════════════
     MCP REINITIALIZE — REAL reconnection
     ═══════════════════════════════════ */
  if (type === 'mcp-reinit') {
    const server = name ? global._mcpServers[name] : null;
    if (!server || !server.url) {
      return res.status(200).json({ success: false, error: 'Server not found or no URL' });
    }

    global._mcpConnected[name] = { requiresOAuth: false, connectionState: 'connecting' };

    try {
      const result = await discoverTools(server.url, 12000);
      const mcpTools = (result.tools || []).map(function (t) {
        return {
          name: t.name,
          pluginKey: name + '_' + t.name,
          description: t.description || '',
          inputSchema: t.inputSchema || { type: 'object', properties: {} },
        };
      });

      server.tools = mcpTools;
      global._mcpServers[name] = server;
      global._mcpConnected[name] = { requiresOAuth: false, connectionState: 'connected' };

      mcpTools.forEach(function (t) {
        global._mcpToolIndex[t.name] = { serverName: name, sseUrl: server.url };
        global._mcpToolIndex[t.pluginKey] = { serverName: name, sseUrl: server.url, realName: t.name };
      });

      return res.status(200).json({ success: true, tools: mcpTools.length });
    } catch (err) {
      global._mcpConnected[name] = {
        requiresOAuth: (err.message || '').indexOf('401') !== -1,
        connectionState: 'error',
        error: err.message || 'Reconnection failed',
      };
      return res.status(200).json({ success: false, error: err.message });
    }
  }

  /* ═══════════════════════════════════
     FEATURED MCP CONNECTORS — catalog of known MCP servers
     ═══════════════════════════════════ */
  if (type === 'mcp-featured') {
    return res.status(200).json({
      featured: [
        {
          name: 'filesystem',
          title: 'Filesystem',
          description: 'Read, write, and search files on a local directory. Requires self-hosted MCP server.',
          category: 'productivity',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
          transport: 'stdio',
          selfHosted: true,
        },
        {
          name: 'github',
          title: 'GitHub',
          description: 'Create issues, PRs, search repos, manage branches. Requires GitHub personal access token.',
          category: 'development',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
          transport: 'stdio',
          selfHosted: true,
          envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
        },
        {
          name: 'google-drive',
          title: 'Google Drive',
          description: 'Search and read files from Google Drive. Requires OAuth credentials.',
          category: 'productivity',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
          transport: 'stdio',
          selfHosted: true,
        },
        {
          name: 'slack',
          title: 'Slack',
          description: 'Send messages, read channels, search conversations in Slack workspaces.',
          category: 'communication',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
          transport: 'stdio',
          selfHosted: true,
          envVars: ['SLACK_BOT_TOKEN'],
        },
        {
          name: 'brave-search',
          title: 'Brave Search',
          description: 'Web and local search via Brave Search API. Already built-in via web_search tool.',
          category: 'search',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
          transport: 'stdio',
          selfHosted: true,
          builtIn: true,
        },
        {
          name: 'postgres',
          title: 'PostgreSQL',
          description: 'Query and manage PostgreSQL databases. Read-only by default for safety.',
          category: 'database',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
          transport: 'stdio',
          selfHosted: true,
          envVars: ['DATABASE_URL'],
        },
        {
          name: 'puppeteer',
          title: 'Puppeteer (Browser)',
          description: 'Control a headless browser: navigate pages, take screenshots, fill forms.',
          category: 'automation',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
          transport: 'stdio',
          selfHosted: true,
        },
        {
          name: 'memory',
          title: 'Memory (Knowledge Graph)',
          description: 'Persistent memory using a local knowledge graph. Store and retrieve information across sessions.',
          category: 'productivity',
          setupUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
          transport: 'stdio',
          selfHosted: true,
        },
      ],
      note: 'These are official MCP servers from the Model Context Protocol project. Most require self-hosting. For SSE/Streamable HTTP servers, add the URL in the Connectors panel.',
    });
  }

  /* ═══════════════════════════════════
     SEARCH ENABLE
     ═══════════════════════════════════ */
  if (type === 'search') {
    return res.status(200).json({ enabled: false });
  }

  /* ═══════════════════════════════════
     CONVERSATIONS
     ═══════════════════════════════════ */
  if (type === 'convos') {
    if (req.method === 'GET') {
      // Return conversations from our global store
      const allConvos = [];
      if (global._orStore) {
        for (const [cid, ctx] of global._orStore.entries()) {
          if (ctx.conversationId && ctx.text) {
            const firstMsg = ctx.messages?.find(m => m.role === 'user');
            allConvos.push({
              conversationId: cid,
              title: firstMsg ? firstMsg.content.substring(0, 60) : 'New Chat',
              endpoint: ctx.endpoint || 'custom',
              model: ctx.model || 'gemma4:31b',
              createdAt: new Date(ctx.ts || Date.now()).toISOString(),
              updatedAt: new Date(ctx.ts || Date.now()).toISOString(),
            });
          }
        }
      }
      return res.status(200).json({ conversations: allConvos, pageNumber: 1, pageSize: 25, pages: 1 });
    }
  }

  /* ═══════════════════════════════════
     CONVERSATION DETAIL (single convo by ID)
     ═══════════════════════════════════ */
  if (type === 'convo-detail') {
    const convoId = req.query.convoId || '';
    const ctx = global._orStore?.get(convoId);
    if (!ctx) return res.status(200).json({ conversationId: convoId, title: 'New Chat', endpoint: 'custom', model: 'gemma4:31b', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const firstUserMsg = ctx.messages?.find(m => m.role === 'user');
    return res.status(200).json({
      conversationId: convoId,
      title: firstUserMsg ? firstUserMsg.content.substring(0, 60) : 'New Chat',
      endpoint: ctx.endpoint || 'custom',
      model: ctx.model || 'nvidia/nemotron-nano-9b-v2:free',
      temperature: ctx.temperature || 0.7,
      maxOutputTokens: ctx.maxTokens || 4096,
      createdAt: new Date(ctx.ts || Date.now()).toISOString(),
      updatedAt: new Date(ctx.ts || Date.now()).toISOString(),
    });
  }

  /* ═══════════════════════════════════
     MESSAGES (by conversation ID)
     ═══════════════════════════════════ */
  if (type === 'messages') {
    const convoId = req.query.convoId || '';
    const ctx = global._orStore?.get(convoId);
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

  /* ═══════════════════════════════════
     FILES CONFIG
     ═══════════════════════════════════ */
  if (type === 'files-config') {
    return res.status(200).json({
      serverFileSizeLimit: 20971520,
      avatarSizeLimit: 2097152,
      supportedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
    });
  }

  /* ═══ FILES — real document storage for file_search ═══ */
  if (type === 'files') {
    // POST: Upload a file to the in-memory document index
    if (req.method === 'POST') {
      try {
        if (!global._documents) global._documents = [];
        var fileData = req.body || {};
        if (!fileData.name || !fileData.content) {
          return res.status(400).json({ error: 'File name and content are required. Send JSON: { name, content, type? }' });
        }
        var fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        var doc = {
          id: fileId,
          name: fileData.name,
          content: String(fileData.content).substring(0, 500000), // 500KB max per doc
          type: fileData.type || 'text',
          uploadedAt: new Date().toISOString(),
        };
        global._documents.push(doc);
        return res.status(200).json({
          file_id: fileId,
          name: doc.name,
          type: doc.type,
          size: doc.content.length,
          indexed: true,
          totalDocuments: global._documents.length,
          message: 'File uploaded and indexed. Use file_search tool to search its content.',
        });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid file upload: ' + e.message });
      }
    }
    // GET: List all indexed documents
    if (!global._documents) global._documents = [];
    return res.status(200).json(global._documents.map(function (d) {
      return { file_id: d.id, name: d.name, type: d.type, size: (d.content || '').length, uploadedAt: d.uploadedAt };
    }));
  }

  /* ═══ SPEECH CONFIG ═══ */
  if (type === 'speech-config') {
    return res.status(200).json({});
  }

  /* ═══ USER FAVORITES ═══ */
  if (type === 'favorites') {
    return res.status(200).json([]);
  }

  /* ═══ ALL TAGS (non-list) ═══ */
  if (type === 'tags-all') {
    return res.status(200).json([]);
  }

  /* ═══ SHARE LINK ═══ */
  if (type === 'share-link') {
    return res.status(200).json({ success: false, shareId: '', conversationId: id || '' });
  }

  /* ═══ TOOL CALLS ═══ */
  if (type === 'tool-calls') {
    return res.status(200).json([]);
  }

  /* ═══ CATEGORIES ═══ */
  if (type === 'categories') {
    return res.status(200).json([
      { label: 'General', value: 'general' },
      { label: 'Productivity', value: 'productivity' },
      { label: 'Research', value: 'research' },
      { label: 'Creative', value: 'creative' },
      { label: 'Code', value: 'code' },
      { label: 'Business', value: 'business' },
    ]);
  }

  /* ═══ BANNER ═══ */
  if (type === 'banner') {
    return res.status(200).json([]);
  }

  /* ═══ MEMORIES ═══ */
  if (type === 'memories') {
    if (req.method === 'GET') return res.status(200).json({ memories: [], pageNumber: 1, pageSize: 10, pages: 0 });
    if (req.method === 'POST') {
      return res.status(201).json({ _id: uuid(), content: (req.body || {}).content || '', createdAt: new Date().toISOString() });
    }
    if (req.method === 'DELETE') return res.status(200).json({ success: true });
    return res.status(200).json({ memories: [] });
  }

  /* ═══ MEMORY PREFERENCES ═══ */
  if (type === 'memory-prefs') {
    if (req.method === 'GET') return res.status(200).json({ enabled: true, alwaysLearn: false });
    if (req.method === 'POST' || req.method === 'PUT') return res.status(200).json({ enabled: true, ...(req.body || {}) });
    return res.status(200).json({ enabled: true });
  }

  /* ═══════════════════════════════════
     PRESETS
     ═══════════════════════════════════ */
  if (type === 'presets') {
    if (req.method === 'GET') return res.status(200).json([]);
    if (req.method === 'POST') {
      return res.status(201).json({ _id: uuid(), ...(req.body || {}), createdAt: new Date().toISOString() });
    }
  }

  /* ═══════════════════════════════════
     PROMPTS
     ═══════════════════════════════════ */
  if (type === 'prompts') {
    if (req.method === 'GET') {
      return res.status(200).json({
        promptGroups: [],
        pageNumber: 1,
        pageSize: 10,
        pages: 0,
        filter: {},
      });
    }
  }
  if (type === 'prompts-all') {
    if (req.method === 'GET') {
      return res.status(200).json({
        prompts: [],
        pageNumber: 1,
        pageSize: 10,
        pages: 0,
      });
    }
  }

  /* ═══════════════════════════════════
     TAGS / CATEGORIES
     ═══════════════════════════════════ */
  if (type === 'tags') {
    return res.status(200).json([]);
  }

  /* ═══════════════════════════════════
     SHARED LINKS
     ═══════════════════════════════════ */
  if (type === 'shared-links') {
    if (req.method === 'GET') return res.status(200).json({ links: [], pages: 0 });
    if (req.method === 'POST') {
      const shareId = uuid().substring(0, 8);
      return res.status(201).json({
        shareId,
        url: req.headers.origin + '/share/' + shareId,
        isPublic: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /* ═══════════════════════════════════
     BANNERS
     ═══════════════════════════════════ */
  if (type === 'banners' || type === 'banner') {
    return res.status(200).json([]);
  }

  /* ═══════════════════════════════════
     ROLES
     ═══════════════════════════════════ */
  if (type === 'roles') {
    return res.status(200).json({
      ADMIN: {
        permissions: {
          AGENTS: { USE: true, CREATE: true, SHARED_GLOBAL: true },
          PROMPTS: { USE: true, CREATE: true, SHARED_GLOBAL: true },
          BOOKMARKS: { USE: true, CREATE: true },
          MEMORIES: { USE: true, READ: true, CREATE: true, DELETE: true },
          MULTI_CONVO: { USE: true },
        },
      },
      USER: {
        permissions: {
          AGENTS: { USE: true, CREATE: true, SHARED_GLOBAL: false },
          PROMPTS: { USE: true, CREATE: true, SHARED_GLOBAL: false },
          BOOKMARKS: { USE: true, CREATE: true },
          MEMORIES: { USE: true, READ: true, CREATE: true, DELETE: true },
          MULTI_CONVO: { USE: true },
        },
      },
    });
  }

  /* ═══════════════════════════════════
     PERMISSIONS — always grant full owner access
     VIEW=1, EDIT=2, DELETE=4, SHARE=8 → owner=15
     ═══════════════════════════════════ */
  if (type === 'permissions') {
    return res.status(200).json({ permissionBits: 15 });
  }
  if (type === 'permissions-all') {
    return res.status(200).json({});
  }

  /* ═══════════════════════════════════
     USER — return mock user
     ═══════════════════════════════════ */
  if (type === 'user') {
    return res.status(200).json({
      id: 'user_aurion',
      _id: 'user_aurion',
      username: 'AURION',
      email: 'aurion@aurion.ai',
      name: 'AURION',
      role: 'ADMIN',
      avatar: null,
      provider: 'local',
      plugins: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });
  }

  /* ═══════════════════════════════════
     TERMS OF SERVICE
     ═══════════════════════════════════ */
  if (type === 'terms') {
    return res.status(200).json({ termsAccepted: true });
  }
  if (type === 'terms-accept') {
    return res.status(200).json({ success: true, termsAccepted: true });
  }

  /* ═══════════════════════════════════
     AUTH — refresh / login / logout
     ═══════════════════════════════════ */
  if (type === 'auth-refresh') {
    return res.status(200).json({
      token: 'aurion_token_' + Date.now(),
      user: {
        id: 'user_aurion',
        _id: 'user_aurion',
        username: 'AURION',
        email: 'aurion@aurion.ai',
        name: 'AURION',
        role: 'ADMIN',
        avatar: null,
        provider: 'local',
        plugins: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    });
  }
  if (type === 'auth-login') {
    return res.status(200).json({
      token: 'aurion_token_' + Date.now(),
      user: {
        id: 'user_aurion',
        _id: 'user_aurion',
        username: 'AURION',
        email: 'aurion@aurion.ai',
        name: 'AURION',
        role: 'ADMIN',
        avatar: null,
        provider: 'local',
        plugins: [],
      },
    });
  }
  if (type === 'auth-logout') {
    return res.status(200).json({ message: 'Logged out' });
  }

  /* ═══════════════════════════════════
     ROLES — per-role permission definitions
     ═══════════════════════════════════ */
  if (type === 'role') {
    const roleName = name || 'ADMIN';
    const allPerms = {
      AGENTS: { USE: true, CREATE: true, SHARED_GLOBAL: true },
      PROMPTS: { USE: true, CREATE: true, SHARED_GLOBAL: true },
      BOOKMARKS: { USE: true, CREATE: true },
      MEMORIES: { USE: true, READ: true, CREATE: true, DELETE: true },
      MULTI_CONVO: { USE: true },
    };
    return res.status(200).json({
      name: roleName,
      permissions: allPerms,
    });
  }

  /* ═══ ROLE MEMORIES PERMISSIONS ═══ */
  if (type === 'role-memories') {
    if (req.method === 'PUT') {
      // Accept the memory permissions update
      return res.status(200).json({ success: true });
    }
    return res.status(200).json({ USE: true, READ: true, CREATE: true, DELETE: true, UPDATE: true, OPT_OUT: true });
  }

  /* ═══ KEYS ═══ */
  if (type === 'keys') {
    if (req.method === 'GET') {
      const keyName = req.query.name || 'default';
      return res.status(200).json({ keys: [], name: keyName });
    }
    if (req.method === 'POST') {
      return res.status(201).json({ success: true });
    }
    if (req.method === 'DELETE') {
      return res.status(200).json({ success: true });
    }
    return res.status(200).json({ keys: [] });
  }

  /* ═══ TOOL AUTH ═══ */
  if (type === 'tool-auth') {
    const tool = req.query.tool || 'unknown';
    // Return auth status for the tool
    return res.status(200).json({
      tool: tool,
      authenticated: true,
      requiresAuth: false,
      configured: true,
    });
  }

  return res.status(404).json({ error: 'Unknown endpoint' });
};
