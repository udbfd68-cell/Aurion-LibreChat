/**
 * Parse un model ID OpenRouter en nom lisible
 * "anthropic/claude-opus-4-6" → "Claude Opus 4.6"
 * "google/gemini-2.5-pro" → "Gemini 2.5 Pro"
 * "meta-llama/llama-4-maverick" → "Llama 4 Maverick"
 */
export function parseOpenRouterModelName(modelId: string): string {
  if (!modelId || !modelId.includes('/')) {
    return modelId;
  }

  // Mapping explicite pour les modèles communs
  const KNOWN_MODELS: Record<string, string> = {
    'anthropic/claude-opus-4': 'Claude Opus 4',
    'anthropic/claude-opus-4-6': 'Claude Opus 4.6',
    'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
    'anthropic/claude-sonnet-4-6': 'Claude Sonnet 4.6',
    'anthropic/claude-haiku-4-5': 'Claude Haiku 4.5',
    'anthropic/claude-3-5-sonnet': 'Claude 3.5 Sonnet',
    'anthropic/claude-3-opus': 'Claude 3 Opus',
    'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
    'google/gemini-2.0-flash': 'Gemini 2.0 Flash',
    'openai/gpt-4o': 'GPT-4o',
    'openai/gpt-4o-mini': 'GPT-4o Mini',
    'openai/o1': 'o1',
    'openai/o3': 'o3',
    'openai/o4-mini': 'o4 Mini',
    'meta-llama/llama-4-maverick': 'Llama 4 Maverick',
    'meta-llama/llama-4-scout': 'Llama 4 Scout',
    'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
    'deepseek/deepseek-r1': 'DeepSeek R1',
    'deepseek/deepseek-v3': 'DeepSeek V3',
    'mistralai/mistral-large': 'Mistral Large',
    'mistralai/mistral-small': 'Mistral Small',
    'qwen/qwen-2.5-coder-32b-instruct': 'Qwen 2.5 Coder 32B',
    'x-ai/grok-3': 'Grok 3',
    'x-ai/grok-3-mini': 'Grok 3 Mini',
  };

  if (KNOWN_MODELS[modelId]) {
    return KNOWN_MODELS[modelId];
  }

  // Fallback : parser automatiquement
  const parts = modelId.split('/');
  const modelPart = parts[parts.length - 1];

  return modelPart
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Ai|Api|Llm|Gpt|Llama|Qwen)\b/g, (m) => m.toUpperCase());
}
