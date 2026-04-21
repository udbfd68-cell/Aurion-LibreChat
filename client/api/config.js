import https from 'https';

function proxyToBackend(path, headers) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'librechat-api-ew3n.onrender.com',
      path: path,
      method: 'GET',
      headers: {
        ...headers,
        host: 'librechat-api-ew3n.onrender.com',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', () => resolve({ status: 500, data: null }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ status: 504, data: null });
    });
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Get the real config from backend
  const backendResult = await proxyToBackend('/api/config', {});

  let config = {};
  if (backendResult.status === 200 && backendResult.data) {
    config = backendResult.data;
  }

  // Override branding
  config.appTitle = 'Aurion Chat';
  config.customWelcome = 'Welcome to Aurion Chat — All AI models, one interface.';
  config.modelSelect = true;

  // Enable all sidebar features
  config.interface = {
    bookmarks: true,
    memories: true,
    parameters: true,
    prompts: true,
    agents: true,
    multiConvo: true,
    sidePanel: true,
    presets: true,
    endpointsMenu: true,
    modelSelect: true,
  };

  // Configure endpoints with proper model names
  config.endpoints = [
    {
      name: 'OpenRouter',
      type: 'custom',
      iconURL: '/assets/openrouter.svg',
      models: {
        default: ['nvidia/nemotron-nano-9b-v2:free'],
        fetch: false,
      },
      modelDisplayLabel: 'OpenRouter',
    },
    {
      name: 'Aurion',
      type: 'custom',
      iconURL: '/assets/aurion.svg',
      models: {
        default: ['nvidia/nemotron-nano-9b-v2:free'],
        fetch: false,
      },
      modelDisplayLabel: 'Aurion AI',
    },
  ];

  res.status(200).json(config);
};
