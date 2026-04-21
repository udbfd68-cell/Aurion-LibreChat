const https = require('https');

// Test web search via Brave
async function testWebSearch() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'search.brave.com',
      path: '/search?q=AI+news&source=web',
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ works: res.status === 200, length: data.length }));
    });
    req.on('error', (err) => resolve({ works: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ works: false, error: 'timeout' }); });
    req.end();
  });
}

// Test code execution via Wandbox
async function testCodeExecution() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ code: 'print("hello")', compiler: 'cpython-3.12.7', options: '', stdin: '' });
    const options = {
      hostname: 'wandbox.org',
      path: '/api/compile.json',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ works: result.status !== undefined, status: result.status });
        } catch (e) {
          resolve({ works: false, error: 'parse error' });
        }
      });
    });
    req.on('error', (err) => resolve({ works: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ works: false, error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

(async () => {
  const [webSearch, codeExec] = await Promise.all([testWebSearch(), testCodeExecution()]);
  console.log(JSON.stringify({ webSearch, codeExecution: codeExec }, null, 2));
})();
