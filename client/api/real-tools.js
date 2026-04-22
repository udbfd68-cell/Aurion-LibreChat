'use strict';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import tls from 'tls';

/* ── In-memory document store for file search ── */
if (!global._documents) global._documents = [];
if (!global._calendarEvents) global._calendarEvents = [];

/* ═══════════════════════════════════════════════════════════════
   Generic HTTP Fetch — follows redirects, supports http + https
   ═══════════════════════════════════════════════════════════════ */
function fetchUrl(targetUrl, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    var parsed;
    try { parsed = new URL(targetUrl); } catch (e) { return reject(new Error('Invalid URL: ' + targetUrl)); }
    var mod = parsed.protocol === 'https:' ? https : http;
    var bodyStr = null;
    if (opts.body) bodyStr = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);

    var reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': opts.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }, opts.headers || {}),
      timeout: opts.timeout || 12000,
    };
    if (bodyStr) reqOpts.headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();

    var redirects = 0;
    function doRequest(url) {
      var p;
      try { p = new URL(url); } catch (e) { return reject(new Error('Bad redirect URL')); }
      var m = p.protocol === 'https:' ? https : http;
      var ro = Object.assign({}, reqOpts, { hostname: p.hostname, port: p.port || undefined, path: p.pathname + p.search });
      var req = m.request(ro, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          redirects++;
          var loc = res.headers.location;
          if (!loc.startsWith('http')) loc = p.protocol + '//' + p.hostname + (loc.startsWith('/') ? '' : '/') + loc;
          res.resume();
          return doRequest(loc);
        }
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8'), headers: res.headers });
        });
      });
      req.on('error', function (e) { reject(e); });
      req.on('timeout', function () { req.destroy(); reject(new Error('Request timeout')); });
      if (bodyStr && redirects === 0) req.write(bodyStr);
      req.end();
    }
    doRequest(targetUrl);
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n)); })
    .replace(/\s+/g, ' ')
    .trim();
}

function uuid() { return crypto.randomUUID(); }


/* ═══════════════════════════════════════════════════
   1. REAL Web Search — DuckDuckGo Instant Answer API (reliable, no CAPTCHA)
   ═══════════════════════════════════════════════════ */
async function webSearch(query) {
  if (!query) return JSON.stringify({ error: 'No search query provided', results: [] });

  // Source 1: DuckDuckGo Instant Answer API (structured, no CAPTCHA, works reliably)
  try {
    var iaRes = await fetchUrl('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1', {
      accept: 'application/json', timeout: 8000,
    });
    var ia;
    try { ia = JSON.parse(iaRes.body); } catch (e) { ia = {}; }
    var iaResults = [];
    if (ia.AbstractText) iaResults.push({ url: ia.AbstractURL || '', title: ia.Heading || query, snippet: ia.AbstractText });
    if (ia.RelatedTopics) {
      ia.RelatedTopics.slice(0, 5).forEach(function (t) {
        if (t.Text && t.FirstURL) iaResults.push({ url: t.FirstURL, title: (t.Text.split(' - ')[0] || '').substring(0, 120), snippet: t.Text });
      });
    }
    if (iaResults.length > 0) return JSON.stringify({ results: iaResults, source: 'DuckDuckGo Instant Answers', count: iaResults.length, query: query });
  } catch (e) { /* IA failed, try next */ }

  // Source 2: DuckDuckGo HTML (works from non-blocked IPs)
  try {
    var ddgRes = await fetchUrl('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'q=' + encodeURIComponent(query) + '&b=',
      timeout: 10000,
    });
    if (ddgRes.status === 200) {
      var ddgResults = parseDDGHtml(ddgRes.body);
      if (ddgResults.length > 0) return JSON.stringify({ results: ddgResults, source: 'DuckDuckGo', count: ddgResults.length, query: query });
    }
  } catch (e) { /* DDG failed */ }

  // Source 3: Brave Search (works from Vercel IPs, unlike DDG which returns 403)
  try {
    var braveRes = await fetchUrl('https://search.brave.com/search?q=' + encodeURIComponent(query) + '&source=web', { timeout: 12000 });
    if (braveRes.status === 200 && braveRes.body.length > 5000) {
      var results = parseBraveHtml(braveRes.body);
      if (results.length > 0) return JSON.stringify({ results: results, source: 'Brave Search', count: results.length, query: query });
    }
  } catch (e) { /* Brave failed */ }

  return JSON.stringify({ results: [], error: 'All search sources returned no results for this query', query: query });
}

function parseBraveHtml(html) {
  var results = [];
  // Brave embeds results in <a> tags with specific data attributes and within .snippet containers
  // Extract URLs that appear as search result links (not CDN/Brave internal links)
  var linkRegex = /<a[^>]+href="(https?:\/\/(?!search\.brave\.com|cdn\.)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  var seen = {};
  var m;
  while ((m = linkRegex.exec(html)) !== null && results.length < 10) {
    var url = m[1];
    // Skip non-result URLs
    if (url.match(/\.(css|js|png|jpg|svg|woff|ico)/) || url.includes('brave.com') || url.includes('jsdelivr') || url.includes('w3.org')) continue;
    if (seen[url]) continue;
    seen[url] = true;
    var title = m[2].replace(/<[^>]+>/g, '').trim();
    if (title.length < 3 || title.length > 300) continue;
    results.push({ url: url, title: title, snippet: '' });
  }

  // Try to extract snippets from nearby text (description divs near result URLs)
  var descRegex = /<div[^>]*class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  var descs = [];
  while ((m = descRegex.exec(html)) !== null) {
    descs.push(m[1].replace(/<[^>]+>/g, '').trim());
  }
  for (var i = 0; i < results.length && i < descs.length; i++) {
    results[i].snippet = descs[i] || '';
  }

  // If regex approach finds too few results, try parsing from stripped text
  if (results.length < 3) {
    var text = stripHtml(html);
    var textResults = parseSearchText(text);
    if (textResults.length > results.length) results = textResults;
  }

  return results;
}

function parseSearchText(text) {
  // Parse search results from stripped text (URL patterns: "domain.com › path Title Description")
  var results = [];
  var pattern = /([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s+›[^\n]*?)\s+([\s\S]*?)(?=(?:[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?\s+›)|$)/gi;
  var m;
  while ((m = pattern.exec(text)) !== null && results.length < 8) {
    var header = m[1].trim();
    var body = m[2].trim();
    // Extract domain from header
    var domainMatch = header.match(/^([a-z0-9.-]+\.[a-z]{2,})/i);
    var domain = domainMatch ? domainMatch[1] : '';
    // Title is after the › chain
    var parts = header.split('›');
    var title = parts[parts.length - 1].trim();
    if (!title) title = parts.length > 1 ? parts[parts.length - 2].trim() : header;
    // Snippet is first 200 chars of body
    var snippet = body.substring(0, 250).replace(/\s+/g, ' ');
    if (domain && title) {
      results.push({ url: 'https://' + domain, title: title, snippet: snippet });
    }
  }
  return results;
}

function parseDDGHtml(html) {
  var results = [];
  var titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  var snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  var titles = [], m;
  while ((m = titleRegex.exec(html)) !== null) {
    var href = m[1];
    if (href.indexOf('uddg=') !== -1) {
      try { href = decodeURIComponent(href.split('uddg=')[1].split('&')[0]); } catch (e) { /* keep original */ }
    }
    titles.push({ url: href, title: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  var snippets = [];
  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
  }
  for (var i = 0; i < Math.min(titles.length, 8); i++) {
    results.push({ url: titles[i].url, title: titles[i].title, snippet: snippets[i] || '' });
  }
  return results;
}


/* ═══════════════════════════════════════════════════
   2. REAL Browser — HTTP fetch + HTML parsing
   ═══════════════════════════════════════════════════ */
async function browser(url, action) {
  if (!url) return JSON.stringify({ error: 'No URL provided' });
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  if (action === 'screenshot') {
    return JSON.stringify({ error: 'Screenshots require a headless browser service (Puppeteer/Playwright). Use action "read" to extract text content.' });
  }

  try {
    var res = await fetchUrl(url, { timeout: 12000 });

    var titleMatch = res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var title = titleMatch ? stripHtml(titleMatch[1]).substring(0, 200) : '';

    var metaMatch = res.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i);
    var description = metaMatch ? metaMatch[1].trim().substring(0, 500) : '';

    var content = stripHtml(res.body);
    if (content.length > 8000) content = content.substring(0, 8000) + '\n... [truncated at 8000 chars]';

    var links = [];
    var linkRegex = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    var lm;
    while ((lm = linkRegex.exec(res.body)) !== null && links.length < 10) {
      var lt = stripHtml(lm[2]).trim();
      if (lt && lt.length > 2 && lt.length < 100) links.push({ href: lm[1], text: lt });
    }

    return JSON.stringify({ url: url, title: title, description: description, content: content, links: links, status: res.status, size: res.body.length });
  } catch (e) {
    return JSON.stringify({ error: 'Failed to browse ' + url + ': ' + e.message });
  }
}


/* ═══════════════════════════════════════════════════
   3. REAL Code Execution — Wandbox API (free, no key)
   ═══════════════════════════════════════════════════ */
async function executeCode(language, code) {
  if (!code) return JSON.stringify({ error: 'No code provided' });
  if (code.length > 50000) return JSON.stringify({ error: 'Code too large (max 50KB)' });

  var langMap = {
    'python': 'python3', 'python3': 'python3', 'py': 'python3',
    'javascript': 'javascript', 'js': 'javascript', 'node': 'javascript', 'nodejs': 'javascript',
    'typescript': 'typescript', 'ts': 'typescript',
    'java': 'java', 'c': 'c', 'cpp': 'c++', 'c++': 'c++',
    'csharp': 'csharp', 'c#': 'csharp', 'go': 'go', 'golang': 'go',
    'rust': 'rust', 'ruby': 'ruby', 'php': 'php',
    'bash': 'bash', 'sh': 'bash', 'shell': 'bash',
    'r': 'r', 'lua': 'lua', 'perl': 'perl', 'swift': 'swift',
    'kotlin': 'kotlin', 'scala': 'scala', 'haskell': 'haskell',
  };
  var lang = langMap[(language || 'python').toLowerCase()] || language || 'python3';

  // Wandbox compiler mapping
  var wandboxCompilers = {
    'python3': 'cpython-3.12.7', 'javascript': 'nodejs-20.17.0', 'typescript': 'typescript-5.3.3',
    'c': 'gcc-14.2.0-c', 'c++': 'gcc-14.2.0', 'java': 'openjdk-jdk-21+35',
    'go': 'go-1.23.1', 'rust': 'rust-1.81.0', 'ruby': 'ruby-3.3.5',
    'php': 'php-8.3.11', 'bash': 'bash', 'perl': 'perl-5.40.0',
    'haskell': 'ghc-9.8.2', 'lua': 'lua-5.4.7', 'swift': 'swift-5.10.1',
    'csharp': 'mono-6.12.0.200', 'scala': 'scala-3.5.0',
  };
  var compiler = wandboxCompilers[lang];
  if (!compiler) {
    return JSON.stringify({ error: 'Unsupported language: ' + lang + '. Supported: ' + Object.keys(wandboxCompilers).join(', ') });
  }

  try {
    var wbBody = JSON.stringify({ code: code, compiler: compiler, options: '', stdin: '' });
    var res = await fetchUrl('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: wbBody,
      timeout: 25000,
    });

    var result;
    try { result = JSON.parse(res.body); } catch (e) {
      return JSON.stringify({ error: 'Invalid response from code execution service: ' + res.body.substring(0, 300) });
    }
    if (result.status === undefined && result.signal) {
      return JSON.stringify({ error: 'Execution killed by signal: ' + result.signal, stderr: result.program_error || result.compiler_error || '' });
    }
    return JSON.stringify({
      language: lang,
      compiler: compiler,
      stdout: result.program_output || result.program_message || '',
      stderr: result.program_error || '',
      compilerOutput: result.compiler_output || result.compiler_error || '',
      exitCode: parseInt(result.status || '0', 10),
      signal: result.signal || null,
    });
  } catch (e) {
    return JSON.stringify({ error: 'Code execution failed: ' + e.message });
  }
}


/* ═══════════════════════════════════════════════════
   4. REAL Email Sending — Resend API (free: 100/day)
   ═══════════════════════════════════════════════════ */
async function sendEmail(to, subject, body) {
  var RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return JSON.stringify({
      error: 'Email service not configured. To enable real email sending:\n1. Sign up free at https://resend.com (100 emails/day free)\n2. Get your API key\n3. Add RESEND_API_KEY to your Vercel environment variables',
      configured: false,
    });
  }
  if (!to) return JSON.stringify({ error: 'Recipient email address (to) is required' });
  if (!subject) return JSON.stringify({ error: 'Email subject is required' });

  try {
    var emailBody = JSON.stringify({
      from: process.env.EMAIL_FROM || 'Aurion <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: '<div style="font-family:sans-serif;line-height:1.6;">' + (body || '').replace(/\n/g, '<br>') + '</div>',
    });

    var res = await fetchUrl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND_KEY },
      body: emailBody,
      timeout: 10000,
    });

    var result;
    try { result = JSON.parse(res.body); } catch (e) { return JSON.stringify({ error: 'Invalid response from email service' }); }
    if (result.id) return JSON.stringify({ success: true, messageId: result.id, to: to, subject: subject, sentAt: new Date().toISOString() });
    return JSON.stringify({ error: result.message || 'Email send failed', statusCode: result.statusCode || res.status });
  } catch (e) {
    return JSON.stringify({ error: 'Email send failed: ' + e.message });
  }
}


/* ═══════════════════════════════════════════════════
   5. REAL Read Email — IMAP client over TLS
   ═══════════════════════════════════════════════════ */
async function readEmail(folder, search, limit) {
  var IMAP_HOST = process.env.IMAP_HOST;
  var IMAP_PORT = parseInt(process.env.IMAP_PORT || '993');
  var IMAP_USER = process.env.IMAP_USER;
  var IMAP_PASS = process.env.IMAP_PASSWORD;

  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
    return JSON.stringify({
      error: 'Email reading requires IMAP configuration. Set these environment variables in Vercel:\n' +
        '• IMAP_HOST — e.g. imap.gmail.com, outlook.office365.com, imap.mail.yahoo.com\n' +
        '• IMAP_PORT — default 993 (TLS)\n' +
        '• IMAP_USER — your full email address\n' +
        '• IMAP_PASSWORD — your password or app-specific password\n\n' +
        'For Gmail: Enable 2FA → Create App Password at https://myaccount.google.com/apppasswords\n' +
        'For Outlook: Use your regular password or enable App Passwords in security settings',
      configured: false,
      providers: {
        gmail: { host: 'imap.gmail.com', port: 993 },
        outlook: { host: 'outlook.office365.com', port: 993 },
        yahoo: { host: 'imap.mail.yahoo.com', port: 993 },
        icloud: { host: 'imap.mail.me.com', port: 993 },
        zoho: { host: 'imap.zoho.com', port: 993 },
        fastmail: { host: 'imap.fastmail.com', port: 993 },
        protonmail: { host: 'imap requires ProtonMail Bridge', port: 993 },
      },
    });
  }

  var maxResults = Math.min(parseInt(limit) || 10, 25);
  var targetFolder = (folder || 'INBOX').replace(/"/g, '');

  // Build IMAP SEARCH criteria from user query
  var searchCriteria = 'ALL';
  if (search) {
    var s = search.replace(/"/g, '').trim();
    if (s.indexOf('@') !== -1) {
      searchCriteria = 'FROM "' + s + '"';
    } else if (s.toLowerCase() === 'unread' || s.toLowerCase() === 'unseen') {
      searchCriteria = 'UNSEEN';
    } else if (s.toLowerCase() === 'flagged' || s.toLowerCase() === 'starred') {
      searchCriteria = 'FLAGGED';
    } else if (s.toLowerCase() === 'today') {
      var today = new Date();
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      searchCriteria = 'SINCE ' + today.getDate() + '-' + months[today.getMonth()] + '-' + today.getFullYear();
    } else {
      searchCriteria = 'OR SUBJECT "' + s + '" FROM "' + s + '"';
    }
  }

  return new Promise(function (resolve) {
    var tagNum = 0;
    var buffer = '';
    var phase = 'greeting';
    var msgIds = [];
    var emails = [];
    var currentFetch = 0;
    var fetchAccum = '';
    var timer = null;
    var socket = null;
    var destroyed = false;

    function nextTag() { return 'A' + (++tagNum); }

    function cleanup() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch (e) { /* */ }
    }

    function done(error) {
      cleanup();
      phase = 'done';
      if (error) {
        resolve(JSON.stringify({ error: error, emails: emails, count: emails.length }));
      } else {
        resolve(JSON.stringify({
          emails: emails,
          count: emails.length,
          folder: targetFolder,
          search: search || null,
          host: IMAP_HOST,
          fetchedAt: new Date().toISOString(),
        }));
      }
    }

    timer = setTimeout(function () { done('IMAP connection timeout (20s). Check IMAP_HOST and IMAP_PORT.'); }, 20000);

    try {
      socket = tls.connect({ host: IMAP_HOST, port: IMAP_PORT, rejectUnauthorized: false, servername: IMAP_HOST });
    } catch (e) {
      return done('TLS connection failed: ' + e.message);
    }

    socket.on('error', function (err) { if (phase !== 'done') done('IMAP error: ' + err.message); });
    socket.on('close', function () { if (phase !== 'done') done(null); });

    function send(cmd) {
      if (destroyed) return 'X0';
      var tag = nextTag();
      try { socket.write(tag + ' ' + cmd + '\r\n'); } catch (e) { /* */ }
      return tag;
    }

    socket.on('data', function (chunk) {
      if (destroyed) return;
      buffer += chunk.toString('utf-8');
      processBuffer();
    });

    function processBuffer() {
      while (buffer.indexOf('\r\n') !== -1) {
        var idx = buffer.indexOf('\r\n');
        var line = buffer.substring(0, idx);
        buffer = buffer.substring(idx + 2);
        handleLine(line);
        if (destroyed) return;
      }
    }

    function handleLine(line) {
      switch (phase) {
        case 'greeting':
          if (/^\* (OK|PREAUTH)/i.test(line)) {
            phase = 'login';
            send('LOGIN "' + IMAP_USER.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '" "' + IMAP_PASS.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
          }
          break;
        case 'login':
          if (/^A\d+ OK/i.test(line)) {
            phase = 'select';
            send('SELECT "' + targetFolder + '"');
          } else if (/^A\d+ (NO|BAD)/i.test(line)) {
            done('Authentication failed. Check IMAP_USER and IMAP_PASSWORD. For Gmail, use an App Password.');
          }
          break;
        case 'select':
          if (/^A\d+ OK/i.test(line)) {
            phase = 'search';
            send('SEARCH ' + searchCriteria);
          } else if (/^A\d+ (NO|BAD)/i.test(line)) {
            done('Cannot open folder "' + targetFolder + '". Available folders: INBOX, Sent, Drafts, Trash, Spam');
          }
          break;
        case 'search':
          if (/^\* SEARCH/i.test(line)) {
            var ids = line.replace(/^\* SEARCH\s*/i, '').trim().split(/\s+/).filter(Boolean);
            msgIds = ids.slice(-maxResults).reverse(); // Latest first
          }
          if (/^A\d+ OK/i.test(line)) {
            if (msgIds.length === 0) {
              done(null); // No emails found
            } else {
              phase = 'fetch';
              currentFetch = 0;
              fetchAccum = '';
              send('FETCH ' + msgIds[0] + ' (FLAGS INTERNALDATE BODY[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID REPLY-TO)])');
            }
          }
          break;
        case 'fetch':
          fetchAccum += line + '\n';
          if (/^A\d+ OK/i.test(line)) {
            parseEmailFromFetch(fetchAccum);
            currentFetch++;
            if (currentFetch >= msgIds.length) {
              phase = 'done';
              send('LOGOUT');
              setTimeout(function () { done(null); }, 300);
            } else {
              fetchAccum = '';
              send('FETCH ' + msgIds[currentFetch] + ' (FLAGS INTERNALDATE BODY[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID REPLY-TO)])');
            }
          } else if (/^A\d+ (NO|BAD)/i.test(line)) {
            currentFetch++;
            if (currentFetch >= msgIds.length) {
              phase = 'done';
              send('LOGOUT');
              setTimeout(function () { done(null); }, 300);
            } else {
              fetchAccum = '';
              send('FETCH ' + msgIds[currentFetch] + ' (FLAGS INTERNALDATE BODY[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID REPLY-TO)])');
            }
          }
          break;
      }
    }

    function parseEmailFromFetch(raw) {
      var from = extractHeader(raw, 'From');
      var to = extractHeader(raw, 'To');
      var cc = extractHeader(raw, 'Cc');
      var subject = extractHeader(raw, 'Subject');
      var date = extractHeader(raw, 'Date');
      var msgId = extractHeader(raw, 'Message-ID');
      var replyTo = extractHeader(raw, 'Reply-To');
      var flagsMatch = raw.match(/FLAGS\s*\(([^)]*)\)/i);
      var flags = flagsMatch ? flagsMatch[1].trim() : '';
      var dateMatch = raw.match(/INTERNALDATE\s*"([^"]*)"/i);
      var internalDate = dateMatch ? dateMatch[1] : '';
      if (from || to || subject) {
        emails.push({
          id: msgId || ('msg-' + currentFetch),
          from: decodeImapHeader(from),
          to: decodeImapHeader(to),
          cc: cc ? decodeImapHeader(cc) : undefined,
          replyTo: replyTo ? decodeImapHeader(replyTo) : undefined,
          subject: decodeImapHeader(subject),
          date: date || internalDate,
          flags: flags.split(/\s+/).filter(Boolean),
          read: flags.indexOf('\\Seen') !== -1,
          flagged: flags.indexOf('\\Flagged') !== -1,
          answered: flags.indexOf('\\Answered') !== -1,
        });
      }
    }

    function extractHeader(raw, name) {
      var regex = new RegExp('^' + name + ':\\s*(.+)', 'im');
      var m = raw.match(regex);
      return m ? m[1].trim() : '';
    }

    function decodeImapHeader(str) {
      if (!str) return '';
      // Decode MIME encoded-word: =?charset?encoding?text?=
      return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_, charset, enc, text) {
        if (enc.toUpperCase() === 'B') {
          try { return Buffer.from(text, 'base64').toString('utf-8'); } catch (e) { return text; }
        }
        if (enc.toUpperCase() === 'Q') {
          return text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, function (__, hex) {
            return String.fromCharCode(parseInt(hex, 16));
          });
        }
        return text;
      });
    }
  });
}


/* ═══════════════════════════════════════════════════
   6. REAL Calendar — full event management
   ═══════════════════════════════════════════════════ */
async function calendar(action, title, date, eventId) {
  switch (action) {
    case 'create': {
      if (!title) return JSON.stringify({ error: 'Event title is required' });
      var parsedDate = parseFlexibleDate(date);
      var ev = {
        id: uuid(),
        title: title,
        date: parsedDate,
        dateRaw: date || null,
        createdAt: new Date().toISOString(),
        status: 'confirmed',
        reminders: [],
      };
      global._calendarEvents.push(ev);
      return JSON.stringify({
        success: true,
        event: ev,
        total: global._calendarEvents.length,
        note: 'Event stored in session memory. For Google Calendar sync, connect the Google Calendar MCP server from Connectors.',
      });
    }
    case 'list': {
      var events = global._calendarEvents;
      if (date) {
        var filterDate = parseFlexibleDate(date);
        var filterDay = new Date(filterDate).toDateString();
        events = events.filter(function (e) {
          try { return new Date(e.date).toDateString() === filterDay; } catch (er) { return false; }
        });
      }
      // Sort by date ascending
      events = events.slice().sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      // Group by day
      var grouped = {};
      events.forEach(function (e) {
        var day;
        try { day = new Date(e.date).toDateString(); } catch (er) { day = 'Unknown'; }
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(e);
      });
      return JSON.stringify({ events: events, count: events.length, grouped: grouped });
    }
    case 'update': {
      if (!eventId) return JSON.stringify({ error: 'eventId is required for update' });
      var idx = global._calendarEvents.findIndex(function (e) { return e.id === eventId; });
      if (idx === -1) return JSON.stringify({ error: 'Event not found: ' + eventId, availableIds: global._calendarEvents.map(function (e) { return { id: e.id, title: e.title }; }) });
      if (title) global._calendarEvents[idx].title = title;
      if (date) {
        global._calendarEvents[idx].date = parseFlexibleDate(date);
        global._calendarEvents[idx].dateRaw = date;
      }
      global._calendarEvents[idx].updatedAt = new Date().toISOString();
      return JSON.stringify({ success: true, event: global._calendarEvents[idx] });
    }
    case 'delete': {
      if (!eventId) return JSON.stringify({ error: 'eventId is required for deletion' });
      var before = global._calendarEvents.length;
      var deleted = global._calendarEvents.find(function (e) { return e.id === eventId; });
      global._calendarEvents = global._calendarEvents.filter(function (e) { return e.id !== eventId; });
      return JSON.stringify({ success: global._calendarEvents.length < before, deleted: deleted || eventId });
    }
    case 'clear': {
      var count = global._calendarEvents.length;
      global._calendarEvents = [];
      return JSON.stringify({ success: true, cleared: count });
    }
    case 'search': {
      if (!title) return JSON.stringify({ error: 'Search term required (pass as title parameter)' });
      var query = title.toLowerCase();
      var matches = global._calendarEvents.filter(function (e) {
        return (e.title || '').toLowerCase().indexOf(query) !== -1;
      });
      return JSON.stringify({ results: matches, count: matches.length, query: title });
    }
    default:
      return JSON.stringify({ error: 'Invalid action: ' + action + '. Use: list, create, update, delete, search, clear' });
  }
}

/** Parse flexible date strings (today, tomorrow, next monday, 2026-04-20, etc.) */
function parseFlexibleDate(str) {
  if (!str) return new Date().toISOString();
  var s = str.toLowerCase().trim();
  var now = new Date();
  if (s === 'today' || s === "aujourd'hui") return now.toISOString();
  if (s === 'tomorrow' || s === 'demain') return new Date(now.getTime() + 86400000).toISOString();
  if (s === 'yesterday' || s === 'hier') return new Date(now.getTime() - 86400000).toISOString();
  var inMatch = s.match(/^in\s+(\d+)\s+(day|hour|minute|week|month)s?$/i);
  if (inMatch) {
    var n = parseInt(inMatch[1]);
    var unit = inMatch[2].toLowerCase();
    var ms = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
    return new Date(now.getTime() + n * (ms[unit] || 86400000)).toISOString();
  }
  var daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var nextDayMatch = s.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
  if (nextDayMatch) {
    var target = daysOfWeek.indexOf(nextDayMatch[1].toLowerCase());
    var curr = now.getDay();
    var diff = (target - curr + 7) % 7 || 7;
    return new Date(now.getTime() + diff * 86400000).toISOString();
  }
  // Try standard date parsing
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return str; // Return as-is if unparsable
}


/* ═══════════════════════════════════════════════════════════
   7. REAL Prospector — multi-strategy lead discovery
   ═══════════════════════════════════════════════════════════ */
async function prospector(company, role, industry) {
  if (!company && !role && !industry) {
    return JSON.stringify({ error: 'Provide at least a company name, role, or industry to search for prospects' });
  }

  var leads = [];
  var searches = [];
  var seen = {};

  // Strategy 1: Company leadership/team search
  if (company) {
    searches.push({ query: company + ' leadership team executives LinkedIn', strategy: 'leadership' });
    searches.push({ query: company + ' "contact us" email address team', strategy: 'contact_info' });
  }

  // Strategy 2: Specific role at company
  if (role && company) {
    searches.push({ query: '"' + company + '" "' + role + '" LinkedIn profile', strategy: 'specific_role' });
  }

  // Strategy 3: Role in industry
  if (role && industry && !company) {
    searches.push({ query: role + ' ' + industry + ' company LinkedIn top', strategy: 'industry_role' });
  }

  // Strategy 4: Industry companies
  if (industry && !company) {
    searches.push({ query: industry + ' companies leaders ' + (role || 'CEO founder') + ' 2026', strategy: 'industry_companies' });
  }

  // Strategy 5: Company website for direct contact info
  if (company) {
    searches.push({ query: 'site:' + company.toLowerCase().replace(/\s+/g, '') + '.com contact OR team OR about', strategy: 'company_site' });
  }

  // Execute searches (max 3 to stay fast)
  for (var i = 0; i < Math.min(searches.length, 3); i++) {
    try {
      var searchResult = await webSearch(searches[i].query);
      var parsed;
      try { parsed = JSON.parse(searchResult); } catch (e) { continue; }

      (parsed.results || []).forEach(function (r) {
        if (!r.url || seen[r.url]) return;
        seen[r.url] = true;

        var isLinkedIn = r.url.indexOf('linkedin.com') !== -1;
        var isCompanySite = company && r.url.toLowerCase().indexOf(company.toLowerCase().replace(/\s+/g, '')) !== -1;
        var emailMatch = (r.snippet || '').match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
        var phoneMatch = (r.snippet || '').match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
        var nameMatch = (r.title || '').match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);

        // Determine lead type
        var type = 'web_page';
        if (isLinkedIn) {
          if (r.url.indexOf('/in/') !== -1) type = 'linkedin_profile';
          else if (r.url.indexOf('/company/') !== -1) type = 'linkedin_company';
        } else if (isCompanySite) {
          type = 'company_page';
        }

        // Score relevance
        var relevance = 'low';
        if (isLinkedIn && r.url.indexOf('/in/') !== -1) relevance = 'high';
        else if (emailMatch) relevance = 'high';
        else if (isCompanySite) relevance = 'medium';
        else if (isLinkedIn) relevance = 'medium';

        leads.push({
          source: r.url,
          title: r.title || '',
          snippet: (r.snippet || '').substring(0, 300),
          type: type,
          strategy: searches[i].strategy,
          relevance: relevance,
          contactName: nameMatch ? nameMatch[1] : null,
          email: emailMatch ? emailMatch[0] : null,
          phone: phoneMatch ? phoneMatch[0].trim() : null,
        });
      });
    } catch (e) { /* continue to next strategy */ }
  }

  // Sort by relevance (high first)
  leads.sort(function (a, b) {
    var ra = a.relevance === 'high' ? 3 : (a.relevance === 'medium' ? 2 : 1);
    var rb = b.relevance === 'high' ? 3 : (b.relevance === 'medium' ? 2 : 1);
    return rb - ra;
  });

  return JSON.stringify({
    company: company || null,
    role: role || null,
    industry: industry || null,
    leads: leads.slice(0, 20),
    totalFound: leads.length,
    searchStrategies: searches.map(function (s) { return s.strategy; }),
    note: 'Results from real web search across multiple strategies. For verified contact data with emails/phones, integrate LinkedIn Sales Navigator, Apollo.io, or Hunter.io via MCP connectors.',
  });
}


/* ═══════════════════════════════════════════════════
   8. REAL File Search — in-memory document store with keyword search
   ═══════════════════════════════════════════════════ */
async function fileSearch(query) {
  if (!query) return JSON.stringify({ error: 'No search query provided' });

  var docs = global._documents;
  if (docs.length === 0) {
    return JSON.stringify({
      results: [],
      totalDocuments: 0,
      query: query,
      note: 'No documents are currently indexed. Upload files through the chat interface or POST to /api/files to add searchable documents.',
    });
  }

  var queryTerms = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 1; });
  if (queryTerms.length === 0) return JSON.stringify({ results: [], query: query, error: 'Query too short' });

  var scored = [];
  docs.forEach(function (doc) {
    var text = (doc.content || '').toLowerCase();
    var name = (doc.name || '').toLowerCase();
    var score = 0;
    var passages = [];

    queryTerms.forEach(function (term) {
      var count = 0;
      var searchIdx = 0;
      while (true) {
        var found = text.indexOf(term, searchIdx);
        if (found === -1) break;
        count++;
        if (passages.length < 3) {
          var pStart = Math.max(0, found - 100);
          var pEnd = Math.min(text.length, found + term.length + 100);
          // Try to expand to sentence boundaries
          var sentStart = text.lastIndexOf('.', pStart);
          if (sentStart !== -1 && found - sentStart < 200) pStart = sentStart + 2;
          var sentEnd = text.indexOf('.', pEnd);
          if (sentEnd !== -1 && sentEnd - found < 250) pEnd = sentEnd + 1;
          var passage = doc.content.substring(pStart, pEnd).trim().replace(/\s+/g, ' ');
          if (passage.length > 10) passages.push(passage);
        }
        searchIdx = found + 1;
        if (count > 50) break; // Cap per-term count
      }
      score += count * 2;
      // Filename match bonus
      if (name.indexOf(term) !== -1) score += 10;
    });

    // Exact phrase match bonus
    if (queryTerms.length > 1 && text.indexOf(query.toLowerCase()) !== -1) score += 25;

    if (score > 0) {
      scored.push({
        documentId: doc.id,
        name: doc.name,
        type: doc.type || 'text',
        score: score,
        passages: passages,
        size: (doc.content || '').length,
        uploadedAt: doc.uploadedAt,
      });
    }
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  return JSON.stringify({
    results: scored.slice(0, 10),
    totalDocuments: docs.length,
    matchedDocuments: scored.length,
    query: query,
  });
}

/**
 * Store a document in the in-memory search index.
 * Called from misc.js file upload handler.
 */
function indexDocument(id, name, content, type) {
  // Remove existing doc with same id if re-uploading
  global._documents = global._documents.filter(function (d) { return d.id !== id; });
  global._documents.push({
    id: id,
    name: name,
    content: content,
    type: type || 'text',
    uploadedAt: new Date().toISOString(),
  });
  return { id: id, name: name, size: content.length, indexed: true };
}

/* ═══════════════════════════════════════════════════
   REAL Web Browser — proxies Playwright on Render (Chromium)
   Actions: goto, click, type, press, wait, content, screenshot, snapshot
   ═══════════════════════════════════════════════════ */
async function webBrowser(args) {
  // Accept either {url, action} shortcut or {actions: [...]}
  let actions = [];
  if (Array.isArray(args && args.actions)) {
    actions = args.actions;
  } else if (args && args.url) {
    actions.push({ type: 'goto', url: args.url });
    const action = (args.action || 'content').toLowerCase();
    if (action === 'click' && args.selector) actions.push({ type: 'click', selector: args.selector });
    if (action === 'type' && args.selector) actions.push({ type: 'type', selector: args.selector, text: args.text || '' });
    if (action === 'screenshot') actions.push({ type: 'screenshot' });
    else if (action === 'snapshot') actions.push({ type: 'snapshot' });
    else actions.push({ type: 'content' });
  } else {
    return JSON.stringify({ error: 'webBrowser requires either {url, action} or {actions: [...]}' });
  }

  const backend = process.env.RENDER_BACKEND_URL || 'https://librechat-api-ew3n.onrender.com';
  const secret = process.env.BROWSER_PROXY_SECRET || '';
  if (!secret) return JSON.stringify({ error: 'BROWSER_PROXY_SECRET not configured on Vercel' });

  try {
    const res = await fetchUrl(backend + '/api/browser/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Browser-Secret': secret },
      body: JSON.stringify({ actions, timeoutMs: 30000 }),
      timeout: 45000,
    });
    // Trim base64 screenshots to keep LLM context small
    let parsed;
    try { parsed = JSON.parse(res.body); } catch { return JSON.stringify({ error: 'bad browser response', raw: res.body.slice(0, 400) }); }
    if (parsed && Array.isArray(parsed.results)) {
      parsed.results = parsed.results.map((r) => {
        if (r && r.base64 && r.base64.length > 200) return { ...r, base64: '[image ' + r.base64.length + ' bytes omitted]' };
        return r;
      });
    }
    return JSON.stringify(parsed).slice(0, 12000);
  } catch (e) {
    return JSON.stringify({ error: 'web_browser failed: ' + e.message });
  }
}


export {
  webSearch,
  browser,
  webBrowser,
  executeCode,
  sendEmail,
  readEmail,
  calendar,
  prospector,
  fileSearch,
  indexDocument,
};
