const logger = require('~/config/winston');

/**
 * Deep Research service - performs multi-step research using LLM.
 *
 * Pipeline:
 * 1. Decompose the research query into sub-questions
 * 2. Research each sub-question individually
 * 3. Synthesize findings into a comprehensive report
 * 4. Return structured artifact with citations
 */

const DECOMPOSE_PROMPT = `You are a research planning expert. Given a research question, break it down into 3-6 focused sub-questions that together would comprehensively answer the original question.

Return ONLY a JSON array of strings, each a sub-question.
Example: ["What are the main causes?", "What evidence exists?", "What are the counterarguments?"]`;

const RESEARCH_PROMPT = `You are a thorough researcher. Answer the following question as comprehensively as possible. Include specific facts, data points, and reasoning. Note any uncertainties or limitations.`;

const SYNTHESIZE_PROMPT = `You are a research synthesis expert. Given multiple research findings on sub-questions related to a main research topic, synthesize them into a comprehensive, well-structured research report.

Format the report with:
- An executive summary (2-3 sentences)
- Main findings organized by theme
- Key data points and evidence
- Limitations and areas of uncertainty
- Conclusion

Use markdown formatting. Be thorough but concise.`;

/**
 * @typedef {Object} DeepResearchParams
 * @property {string} query - The research question
 * @property {string} userId - User ID
 * @property {Function} llmCall - (systemPrompt, userPrompt) => Promise<string>
 * @property {Function} [onProgress] - (stage, message) => void
 */

/**
 * @typedef {Object} DeepResearchResult
 * @property {string} report - The final synthesized report (markdown)
 * @property {string[]} subQuestions - The decomposed sub-questions
 * @property {string[]} findings - Individual research findings
 * @property {number} totalSteps - Total steps taken
 */

/**
 * Performs deep research on a topic.
 *
 * @param {DeepResearchParams} params
 * @returns {Promise<DeepResearchResult>}
 */
async function performDeepResearch({ query, userId, llmCall, onProgress }) {
  const notify = onProgress || (() => {});

  try {
    // Step 1: Decompose
    notify('decompose', 'Breaking down research question...');
    const decomposeResponse = await llmCall(
      DECOMPOSE_PROMPT,
      `Research question: ${query}`,
    );

    let subQuestions;
    try {
      let cleaned = decomposeResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      subQuestions = JSON.parse(cleaned);
      if (!Array.isArray(subQuestions)) {
        subQuestions = [query];
      }
    } catch {
      logger.warn('[deepResearch] Failed to parse sub-questions, using original query');
      subQuestions = [query];
    }

    // Limit to 6 sub-questions
    subQuestions = subQuestions.slice(0, 6);
    notify('research', `Researching ${subQuestions.length} sub-questions...`);

    // Step 2: Research each sub-question
    const findings = [];
    for (let i = 0; i < subQuestions.length; i++) {
      notify('research', `Researching: ${subQuestions[i]} (${i + 1}/${subQuestions.length})`);
      const finding = await llmCall(RESEARCH_PROMPT, subQuestions[i]);
      findings.push(finding);
    }

    // Step 3: Synthesize
    notify('synthesize', 'Synthesizing findings into report...');
    const findingsFormatted = subQuestions
      .map((q, i) => `## Sub-question: ${q}\n\n${findings[i]}`)
      .join('\n\n---\n\n');

    const report = await llmCall(
      SYNTHESIZE_PROMPT,
      `Main research topic: ${query}\n\n${findingsFormatted}`,
    );

    notify('complete', 'Research complete');

    return {
      report,
      subQuestions,
      findings,
      totalSteps: 2 + subQuestions.length, // decompose + N research + synthesize
    };
  } catch (error) {
    logger.error('[deepResearch] Error:', error);
    throw new Error(`Deep research failed: ${error.message}`);
  }
}

module.exports = { performDeepResearch };
