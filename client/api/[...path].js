const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Request-Id, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract the path after /api/
  const pathSegments = req.query.path || [];
  const targetPath = '/api/' + pathSegments.join('/');
  const queryString = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const fullPath = queryString ? `${targetPath}?${queryString}` : targetPath;

  // Forward headers
  const fwdHeaders = { host: 'librechat-api-ew3n.onrender.com' };
  const skipHeaders = ['host', 'connection', 'transfer-encoding', 'content-length'];
  for (const [key, val] of Object.entries(req.headers)) {
    if (!skipHeaders.includes(key.toLowerCase())) {
      fwdHeaders[key] = val;
    }
  }

  // Use req.body (Vercel auto-parses it) and re-serialize for proxy
  let bodyData = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body != null) {
    if (Buffer.isBuffer(req.body)) {
      bodyData = req.body;
    } else if (typeof req.body === 'string') {
      bodyData = Buffer.from(req.body);
    } else {
      bodyData = Buffer.from(JSON.stringify(req.body));
    }
    fwdHeaders['content-length'] = bodyData.length;
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'librechat-api-ew3n.onrender.com',
      path: fullPath,
      method: req.method,
      headers: fwdHeaders,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Forward status and headers
      const respHeaders = {};
      for (const [key, val] of Object.entries(proxyRes.headers)) {
        if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          respHeaders[key] = val;
        }
      }
      res.writeHead(proxyRes.statusCode, respHeaders);
      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
    });

    proxyReq.on('error', () => {
      res.status(502).json({ error: 'Backend unavailable' });
      resolve();
    });

    proxyReq.setTimeout(25000, () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Backend timeout' });
      resolve();
    });

    if (bodyData) proxyReq.write(bodyData);
    proxyReq.end();
  });
};
