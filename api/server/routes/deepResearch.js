const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { performDeepResearch } = require('~/server/services/DeepResearch');
const { saveArtifact } = require('~/models');
const { getResponseSender } = require('librechat-data-provider');
const logger = require('~/config/winston');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * POST /deep-research
 * Initiates a deep research session with SSE streaming progress.
 * Body: { query: string, conversationId?: string, model?: string, endpoint?: string }
 */
router.post('/', express.json({ limit: '10kb' }), async (req, res) => {
  try {
    const { query, conversationId, model, endpoint } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Research query is required' });
    }

    if (query.length > 2000) {
      return res.status(400).json({ message: 'Query must be 2000 characters or less' });
    }

    // Set up SSE headers for streaming progress
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    // LLM call using the existing OpenAI-compatible infrastructure
    const llmCall = async (systemPrompt, userPrompt) => {
      try {
        // Use dynamic import of the chat completion client
        const { ChatCompletion } = require('~/app/clients');
        const selectedModel = model || process.env.DEEP_RESEARCH_MODEL || 'gpt-4o-mini';
        const selectedEndpoint = endpoint || process.env.DEEP_RESEARCH_ENDPOINT || 'openAI';

        const client = new ChatCompletion({
          modelOptions: {
            model: selectedModel,
            temperature: 0.3,
            max_tokens: 4096,
          },
        });

        const response = await client.sendCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);

        return typeof response === 'string' ? response : response?.text || response?.content || '';
      } catch (clientError) {
        // Fallback: try using fetch against the configured API
        logger.warn('[deepResearch] ChatCompletion client failed, using fallback', clientError.message);

        const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
        const baseUrl = process.env.OPENAI_REVERSE_PROXY || 'https://api.openai.com/v1';
        const fallbackModel = model || process.env.DEEP_RESEARCH_MODEL || 'gpt-4o-mini';

        if (!apiKey) {
          throw new Error('No API key configured for deep research. Set OPENAI_API_KEY or DEEP_RESEARCH_MODEL in .env');
        }

        const fetchResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 4096,
          }),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          throw new Error(`LLM API error: ${fetchResponse.status} ${errorText}`);
        }

        const data = await fetchResponse.json();
        return data.choices?.[0]?.message?.content || '';
      }
    };

    const onProgress = (stage, message) => {
      sendEvent('progress', { stage, message });
    };

    const result = await performDeepResearch({
      query: query.trim(),
      userId: req.user.id,
      llmCall,
      onProgress,
    });

    // Save the report as an artifact
    if (conversationId) {
      try {
        await saveArtifact({
          userId: req.user.id,
          conversationId,
          messageId: `research-${Date.now()}`,
          identifier: `deep-research-${Date.now()}`,
          title: `Research: ${query.slice(0, 100)}`,
          type: 'text/markdown',
          content: result.report,
        });
      } catch (artifactErr) {
        logger.warn('[deepResearch] Failed to save artifact:', artifactErr.message);
      }
    }

    sendEvent('complete', {
      query: query.trim(),
      report: result.report,
      subQuestions: result.subQuestions,
      totalSteps: result.totalSteps,
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('[deepResearch] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Deep research failed' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
