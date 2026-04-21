/**
 * MCP Client — Real Model Context Protocol over Streamable HTTP and SSE transports.
 *
 * Streamable HTTP (modern, preferred):
 *   POST to endpoint with JSON-RPC, Accept: application/json, text/event-stream
 *   Response is JSON or SSE with message events containing JSON-RPC responses
 *
 * SSE (legacy):
 *   GET SSE endpoint → endpoint event with POST URL → POST JSON-RPC → SSE responses
 */
import https from 'https';
import http from 'http';

/* ── HTTP request helper ── */
function httpRequest(url, opts) {
  return new Promise(function (resolve, reject) {
    var u = new URL(url);
    var mod = u.protocol === 'https:' ? https : http;
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body) {
      headers['Content-Length'] = Buffer.byteLength(opts.body);
    }
    var req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: opts.method || 'POST',
        headers: headers,
      },
      function (res) {
        var data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(opts.timeout || 15000, function () {
      req.destroy();
      reject(new Error('HTTP timeout'));
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/* ── Parse SSE response body into JSON-RPC messages ── */
function parseSSEMessages(text) {
  var messages = [];
  var blocks = text.split('\n\n');
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i].trim();
    if (!block) continue;
    var eventData = '';
    var lines = block.split('\n');
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (line.indexOf('data:') === 0) eventData += line.substring(5).trim();
    }
    if (eventData) {
      try { messages.push(JSON.parse(eventData)); } catch (e) { /* skip */ }
    }
  }
  return messages;
}

/* ═══════════════════════════════════════════════════
   Streamable HTTP Transport (modern MCP)
   ═══════════════════════════════════════════════════ */
function streamableHttpCall(endpoint, method, params, timeoutMs) {
  var id = Date.now();
  var msg = { jsonrpc: '2.0', id: id, method: method };
  if (params) msg.params = params;
  var body = JSON.stringify(msg);

  return httpRequest(endpoint, {
    method: 'POST',
    body: body,
    timeout: timeoutMs || 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
  }).then(function (resp) {
    if (resp.status >= 400) {
      throw new Error('MCP HTTP ' + resp.status + ': ' + resp.data.substring(0, 300));
    }
    var ct = (resp.headers['content-type'] || '').toLowerCase();
    // SSE response (event-stream)
    if (ct.indexOf('text/event-stream') !== -1) {
      var msgs = parseSSEMessages(resp.data);
      for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].id === id) {
          if (msgs[i].error) throw new Error(msgs[i].error.message || JSON.stringify(msgs[i].error));
          return msgs[i].result;
        }
      }
      throw new Error('No matching response in SSE stream');
    }
    // JSON response
    var json = JSON.parse(resp.data);
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    return json.result;
  });
}

/**
 * Full Streamable HTTP session: initialize → notify → callback(session)
 */
function streamableSession(endpoint, callback, timeoutMs) {
  return streamableHttpCall(endpoint, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'aurion-chat', version: '1.0.0' },
  }, timeoutMs).then(function (serverInfo) {
    // Send initialized notification (fire and forget)
    var notifyMsg = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
    httpRequest(endpoint, {
      method: 'POST',
      body: notifyMsg,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    }).catch(function () {});

    return callback({
      listTools: function () {
        return streamableHttpCall(endpoint, 'tools/list', {}, timeoutMs);
      },
      callTool: function (name, args) {
        return streamableHttpCall(endpoint, 'tools/call', { name: name, arguments: args || {} }, timeoutMs);
      },
      serverInfo: serverInfo,
    });
  });
}

/* ═══════════════════════════════════════════════════
   SSE Transport (legacy MCP)
   ═══════════════════════════════════════════════════ */
function sseSession(sseUrl, callback, timeoutMs) {
  timeoutMs = timeoutMs || 12000;

  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      cleanup();
      reject(new Error('MCP timeout (' + timeoutMs + 'ms) connecting to ' + sseUrl));
    }, timeoutMs);

    var sseReq = null;
    var sseResponse = null;
    var buffer = '';
    var postUrl = null;
    var msgId = 0;
    var pendingCallbacks = {};
    var initDone = false;
    var cleaned = false;

    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      try { if (sseResponse) sseResponse.destroy(); } catch (e) { /* */ }
      try { if (sseReq) sseReq.destroy(); } catch (e) { /* */ }
      Object.keys(pendingCallbacks).forEach(function (id) {
        try { pendingCallbacks[id].reject(new Error('MCP session closed')); } catch (e) { /* */ }
      });
    }

    function nextId() { return ++msgId; }

    function send(method, params) {
      var id = nextId();
      var msg = { jsonrpc: '2.0', id: id, method: method };
      if (params) msg.params = params;
      var body = JSON.stringify(msg);
      var promise = new Promise(function (res, rej) {
        pendingCallbacks[id] = { resolve: res, reject: rej };
      });
      httpRequest(postUrl, {
        method: 'POST', body: body, timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }).catch(function (err) {
        if (pendingCallbacks[id]) { pendingCallbacks[id].reject(err); delete pendingCallbacks[id]; }
      });
      return promise;
    }

    function notify(method, params) {
      var msg = { jsonrpc: '2.0', method: method };
      if (params) msg.params = params;
      return httpRequest(postUrl, {
        method: 'POST', body: JSON.stringify(msg), timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      }).catch(function () {});
    }

    function processBuffer() {
      while (buffer.indexOf('\n\n') !== -1) {
        var end = buffer.indexOf('\n\n');
        var block = buffer.substring(0, end);
        buffer = buffer.substring(end + 2);
        var eventType = 'message';
        var eventData = '';
        var lines = block.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('event:') === 0) eventType = line.substring(6).trim();
          else if (line.indexOf('data:') === 0) eventData += line.substring(5).trim();
        }
        if (eventType === 'endpoint' && eventData) {
          postUrl = eventData;
          if (postUrl.charAt(0) === '/') {
            var base = new URL(sseUrl);
            postUrl = base.origin + postUrl;
          }
          doInit();
        } else if (eventType === 'message' && eventData) {
          try {
            var msg = JSON.parse(eventData);
            if (msg.id && pendingCallbacks[msg.id]) {
              var cb = pendingCallbacks[msg.id];
              delete pendingCallbacks[msg.id];
              if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
              else cb.resolve(msg.result);
            }
          } catch (e) { /* skip */ }
        }
      }
    }

    function doInit() {
      send('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'aurion-chat', version: '1.0.0' },
      }).then(function (serverInfo) {
        initDone = true;
        return notify('notifications/initialized').then(function () {
          return callback({
            listTools: function () { return send('tools/list'); },
            callTool: function (name, args) { return send('tools/call', { name: name, arguments: args || {} }); },
            serverInfo: serverInfo,
          });
        });
      }).then(function (result) { cleanup(); resolve(result); })
        .catch(function (err) { cleanup(); reject(err); });
    }

    var u = new URL(sseUrl);
    var mod = u.protocol === 'https:' ? https : http;
    sseReq = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
    }, function (res) {
      sseResponse = res;
      if (res.statusCode !== 200) {
        var errData = '';
        res.on('data', function (c) { errData += c; });
        res.on('end', function () { cleanup(); reject(new Error('MCP SSE HTTP ' + res.statusCode + ': ' + errData.substring(0, 300))); });
        return;
      }
      res.setEncoding('utf8');
      res.on('data', function (chunk) { buffer += chunk; processBuffer(); });
      res.on('end', function () { if (!initDone) { cleanup(); reject(new Error('SSE stream ended before init')); } });
      res.on('error', function (err) { cleanup(); reject(err); });
    });
    sseReq.on('error', function (err) { cleanup(); reject(err); });
    sseReq.setTimeout(timeoutMs, function () { sseReq.destroy(); });
    sseReq.end();
  });
}

/* ═══════════════════════════════════════════════════
   Auto-detect transport and connect
   ═══════════════════════════════════════════════════ */

/**
 * Detect transport type: if URL ends in /sse → SSE, otherwise → Streamable HTTP
 */
function isSSEUrl(url) {
  return url && (url.endsWith('/sse') || url.indexOf('/sse?') !== -1);
}

/**
 * Connect to an MCP server and discover its tools.
 * Auto-detects transport (Streamable HTTP vs SSE).
 * @param {string} url  MCP endpoint
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<{tools: Array, serverInfo: Object}>}
 */
function discoverTools(url, timeoutMs) {
  var tm = timeoutMs || 15000;
  var sessionFn = isSSEUrl(url) ? sseSession : streamableSession;
  return sessionFn(url, function (session) {
    return session.listTools().then(function (result) {
      return { tools: result.tools || [], serverInfo: session.serverInfo };
    });
  }, tm);
}

/**
 * Execute a tool call on an MCP server.
 * @param {string}  url       MCP endpoint
 * @param {string}  toolName  MCP tool name
 * @param {Object}  toolArgs  Tool arguments
 * @param {number}  [timeoutMs=25000]
 * @returns {Promise<{content: Array, isError?: boolean}>}
 */
function callTool(url, toolName, toolArgs, timeoutMs) {
  var tm = timeoutMs || 25000;
  var sessionFn = isSSEUrl(url) ? sseSession : streamableSession;
  return sessionFn(url, function (session) {
    return session.callTool(toolName, toolArgs || {});
  }, tm);
}

export { discoverTools, callTool, streamableSession, sseSession, isSSEUrl };
