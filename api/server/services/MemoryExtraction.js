const logger = require('~/config/winston');
const { setMemory, getAllUserMemories } = require('~/models');

/**
 * System prompt for memory extraction from conversations.
 * Returns a JSON array of {key, value} objects to remember.
 */
const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system. Analyze the conversation and extract important facts about the user that should be remembered for future conversations.

Rules:
- Extract ONLY facts explicitly stated or strongly implied by the user
- Focus on: preferences, personal details, work context, technical stack, recurring patterns
- Keys must be lowercase with underscores only (e.g., preferred_language, coding_style)
- Values should be concise (1-2 sentences max)
- Return an empty array if nothing worth remembering
- Do NOT extract conversation-specific context (what they asked about today)
- Do NOT extract obvious or generic facts

Return ONLY valid JSON: [{"key": "...", "value": "..."}, ...]`;

/**
 * Extracts memories from a conversation and saves them.
 * Called after a conversation turn is complete.
 *
 * @param {Object} params
 * @param {string} params.userId - The user's ID
 * @param {Array<{role: string, content: string}>} params.messages - Recent messages
 * @param {Function} params.llmCall - Function to call the LLM: (systemPrompt, userPrompt) => string
 * @returns {Promise<{extracted: number, saved: number}>}
 */
async function extractAndSaveMemories({ userId, messages, llmCall }) {
  try {
    if (!messages || messages.length < 2) {
      return { extracted: 0, saved: 0 };
    }

    // Format recent messages (last 10 turns max)
    const recentMessages = messages.slice(-20);
    const formatted = recentMessages
      .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 500) : ''}`)
      .join('\n');

    const response = await llmCall(
      MEMORY_EXTRACTION_PROMPT,
      `Conversation:\n${formatted}\n\nExtract memories as JSON array:`,
    );

    let memories;
    try {
      // Parse the LLM response - handle markdown code blocks
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      memories = JSON.parse(cleaned);
    } catch {
      logger.warn('[extractAndSaveMemories] Failed to parse LLM response as JSON');
      return { extracted: 0, saved: 0 };
    }

    if (!Array.isArray(memories) || memories.length === 0) {
      return { extracted: 0, saved: 0 };
    }

    // Validate and sanitize
    const validMemories = memories.filter(
      (m) =>
        m &&
        typeof m.key === 'string' &&
        /^[a-z_]+$/.test(m.key) &&
        typeof m.value === 'string' &&
        m.value.trim().length > 0 &&
        m.key !== 'nothing',
    );

    let saved = 0;
    for (const mem of validMemories) {
      try {
        await setMemory({
          userId,
          key: mem.key,
          value: mem.value.slice(0, 2000),
        });
        saved++;
      } catch (error) {
        logger.warn(`[extractAndSaveMemories] Failed to save memory "${mem.key}":`, error.message);
      }
    }

    return { extracted: validMemories.length, saved };
  } catch (error) {
    logger.error('[extractAndSaveMemories] Error:', error);
    return { extracted: 0, saved: 0 };
  }
}

module.exports = { extractAndSaveMemories, MEMORY_EXTRACTION_PROMPT };
