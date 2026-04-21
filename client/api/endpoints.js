import https from 'https';

// Complete Aurion model catalog — April 2026
const OPENROUTER_MODELS = [
  // ── FREE Models (no credits needed) ──
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'arcee-ai/trinity-large-preview:free',

  // ── Anthropic Claude ──
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.6-fast',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.7-sonnet:thinking',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3-haiku',

  // ── OpenAI GPT ──
  'openai/gpt-5.4-pro',
  'openai/gpt-5.4',
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.3-chat',
  'openai/gpt-5.2-pro',
  'openai/gpt-5.2',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2-chat',
  'openai/gpt-5.1',
  'openai/gpt-5.1-codex',
  'openai/gpt-5.1-codex-max',
  'openai/gpt-5.1-codex-mini',
  'openai/gpt-5.1-chat',
  'openai/gpt-5-pro',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5-codex',
  'openai/gpt-5-chat',
  'openai/gpt-5-image',
  'openai/gpt-5-image-mini',
  'openai/o4-mini-high',
  'openai/o4-mini',
  'openai/o4-mini-deep-research',
  'openai/o3-pro',
  'openai/o3',
  'openai/o3-deep-research',
  'openai/o3-mini-high',
  'openai/o3-mini',
  'openai/o1-pro',
  'openai/o1',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4-turbo',
  'openai/gpt-audio',
  'openai/gpt-audio-mini',

  // ── Google Gemini ──
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash-image',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-lite-001',
  'google/gemma-4-31b-it',
  'google/gemma-4-26b-a4b-it',

  // ── Meta Llama ──
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  'meta-llama/llama-3.3-70b-instruct',
  'meta-llama/llama-3.2-11b-vision-instruct',
  'meta-llama/llama-3.1-70b-instruct',

  // ── DeepSeek ──
  'deepseek/deepseek-r1-0528',
  'deepseek/deepseek-r1',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-v3.2-exp',
  'deepseek/deepseek-chat-v3.1',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-r1-distill-llama-70b',

  // ── Mistral ──
  'mistralai/mistral-large-2512',
  'mistralai/mistral-large',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-medium-3',
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/mistral-small-3.1-24b-instruct',
  'mistralai/mistral-small-2603',
  'mistralai/mistral-small-creative',
  'mistralai/codestral-2508',
  'mistralai/devstral-medium',
  'mistralai/devstral-small',
  'mistralai/devstral-2512',
  'mistralai/pixtral-large-2411',
  'mistralai/voxtral-small-24b-2507',

  // ── Qwen ──
  'qwen/qwen3.6-plus',
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3.5-122b-a10b',
  'qwen/qwen3.5-27b',
  'qwen/qwen3-max',
  'qwen/qwen3-max-thinking',
  'qwen/qwen3-coder-next',
  'qwen/qwen3-coder-plus',
  'qwen/qwen3-coder',
  'qwen/qwen3-coder-flash',
  'qwen/qwen3-235b-a22b',
  'qwen/qwen3-32b',
  'qwen/qwen3-14b',
  'qwen/qwen3-8b',
  'qwen/qwq-32b',
  'qwen/qwen-max',
  'qwen/qwen-plus',
  'qwen/qwen-turbo',

  // ── Cohere ──
  'cohere/command-a',
  'cohere/command-r-plus-08-2024',
  'cohere/command-r-08-2024',

  // ── NVIDIA ──
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/nemotron-nano-9b-v2',
  'nvidia/llama-3.1-nemotron-70b-instruct',

  // ── Perplexity ──
  'perplexity/sonar-pro',
  'perplexity/sonar-pro-search',
  'perplexity/sonar-reasoning-pro',
  'perplexity/sonar-deep-research',
  'perplexity/sonar',
];

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
          resolve({ status: res.statusCode, data: null });
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
  // Set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Forward the auth headers to backend
  const fwdHeaders = {};
  if (req.headers.authorization) fwdHeaders.authorization = req.headers.authorization;
  if (req.headers.cookie) fwdHeaders.cookie = req.headers.cookie;

  // Try to get real endpoints from backend
  const backendResult = await proxyToBackend('/api/endpoints', fwdHeaders);

  let endpointsConfig = {};
  if (backendResult.status === 200 && backendResult.data) {
    endpointsConfig = backendResult.data;
  }

  // Primary endpoint: agents (for Agent Builder)
  endpointsConfig['agents'] = {
    type: 'agents',
    disableBuilder: false,
    order: 1,
    models: OPENROUTER_MODELS,
    capabilities: ['tools', 'actions', 'execute_code', 'file_search'],
  };

  // Custom endpoints array (LibreChat expects 'custom' as array of named endpoints)
  endpointsConfig['custom'] = [
    {
      name: 'Aurion AI',
      type: 'custom',
      userProvide: false,
      userProvideURL: false,
      modelDisplayLabel: 'Aurion',
      models: OPENROUTER_MODELS,
      order: 0,
      iconURL: '/assets/aurion-icon.png',
      apiKey: 'aurion',
      baseURL: '/api/orchat',
    },
    {
      name: 'OpenRouter',
      type: 'custom',
      userProvide: false,
      userProvideURL: false,
      modelDisplayLabel: 'OpenRouter',
      models: OPENROUTER_MODELS,
      order: 2,
      iconURL: '/assets/openrouter-icon.png',
      apiKey: 'aurion',
      baseURL: '/api/orchat',
    },
  ];

  res.status(200).json(endpointsConfig);
};
