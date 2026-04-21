/**
 * openrouterModelNames — Maps raw OpenRouter model IDs
 * ("anthropic/claude-opus-4.6", "google/gemini-2.5-pro", …) to human-readable
 * labels displayed in the model picker. Falls back to a smart humanizer that
 * strips the provider prefix, replaces dashes with spaces, and capitalizes.
 *
 * Kept intentionally simple — no provider calls, no runtime dependencies.
 */

const EXPLICIT_NAMES: Record<string, string> = {
  // Anthropic
  'anthropic/claude-opus-4.6': 'Claude Opus 4.6',
  'anthropic/claude-opus-4.5': 'Claude Opus 4.5',
  'anthropic/claude-opus-4': 'Claude Opus 4',
  'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
  'anthropic/claude-3.7-sonnet': 'Claude 3.7 Sonnet',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'anthropic/claude-3.5-haiku': 'Claude 3.5 Haiku',
  'anthropic/claude-3-opus': 'Claude 3 Opus',
  'anthropic/claude-3-haiku': 'Claude 3 Haiku',

  // Google
  'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'google/gemini-2.0-flash-001': 'Gemini 2.0 Flash',
  'google/gemini-pro-1.5': 'Gemini 1.5 Pro',

  // OpenAI
  'openai/gpt-5': 'GPT-5',
  'openai/gpt-4o': 'GPT-4o',
  'openai/gpt-4o-mini': 'GPT-4o mini',
  'openai/gpt-4-turbo': 'GPT-4 Turbo',
  'openai/o1': 'o1',
  'openai/o1-mini': 'o1-mini',
  'openai/o3': 'o3',
  'openai/o3-mini': 'o3-mini',

  // Meta
  'meta-llama/llama-4-maverick': 'Llama 4 Maverick',
  'meta-llama/llama-4-scout': 'Llama 4 Scout',
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
  'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B',

  // Mistral
  'mistralai/mistral-large': 'Mistral Large',
  'mistralai/mistral-medium': 'Mistral Medium',
  'mistralai/mistral-small': 'Mistral Small',
  'mistralai/codestral-latest': 'Codestral',

  // DeepSeek
  'deepseek/deepseek-r1': 'DeepSeek R1',
  'deepseek/deepseek-v3': 'DeepSeek V3',
  'deepseek/deepseek-chat': 'DeepSeek Chat',

  // xAI
  'x-ai/grok-4': 'Grok 4',
  'x-ai/grok-3': 'Grok 3',
  'x-ai/grok-2-1212': 'Grok 2',

  // Qwen / Alibaba
  'qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B',
  'qwen/qwen-2.5-coder-32b-instruct': 'Qwen 2.5 Coder 32B',

  // Perplexity
  'perplexity/sonar': 'Perplexity Sonar',
  'perplexity/sonar-pro': 'Perplexity Sonar Pro',

  // Local / Aurion
  'gemma4': 'Aurion (Gemma 4)',
  'aurion': 'Aurion',
};

/**
 * Humanize a slug: strip provider prefix, dash→space, capitalize words,
 * preserve number-words like "4o", "3.5", "70b".
 */
function humanize(id: string): string {
  const afterSlash = id.includes('/') ? id.split('/').slice(-1)[0] : id;
  return afterSlash
    .replace(/[-_]+/g, ' ')
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bLlm\b/g, 'LLM')
    .replace(/\bAi\b/g, 'AI')
    .trim();
}

/**
 * Public: resolve a model id to a display name. Returns the humanized
 * fallback when no explicit mapping exists. Never returns "custom".
 */
export function getOpenRouterModelLabel(modelId: string | null | undefined): string {
  if (!modelId) return '';
  const id = String(modelId).trim();
  if (!id) return '';
  const lower = id.toLowerCase();
  if (EXPLICIT_NAMES[lower]) return EXPLICIT_NAMES[lower];
  // Exact match with original case
  if (EXPLICIT_NAMES[id]) return EXPLICIT_NAMES[id];
  return humanize(id);
}

/** Backward-compatible alias. */
export const formatOpenRouterModelName = getOpenRouterModelLabel;

export default getOpenRouterModelLabel;
