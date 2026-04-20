const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Forward to Render backend
  const fwdHeaders = { host: 'librechat-api-ew3n.onrender.com' };
  if (req.headers.authorization) fwdHeaders.authorization = req.headers.authorization;
  if (req.headers.cookie) fwdHeaders.cookie = req.headers.cookie;

  return new Promise((resolve) => {
    const proxyReq = https.request({
      hostname: 'librechat-api-ew3n.onrender.com',
      path: '/api/balance',
      method: 'GET',
      headers: fwdHeaders,
    }, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (c) => (body += c));
      proxyRes.on('end', () => {
        // If backend returns 401/403 (not logged in), return a default balance
        if (proxyRes.statusCode === 401 || proxyRes.statusCode === 403) {
          res.status(200).json({ balance: 0 });
        } else {
          try {
            res.status(proxyRes.statusCode).json(JSON.parse(body));
          } catch {
            res.status(proxyRes.statusCode).send(body);
          }
        }
        resolve();
      });
    });
    proxyReq.on('error', () => {
      // If backend is down, return default balance
      res.status(200).json({ balance: 0 });
      resolve();
    });
    proxyReq.setTimeout(10000, () => {
      proxyReq.destroy();
      res.status(200).json({ balance: 0 });
      resolve();
    });
    proxyReq.end();
  });
};
