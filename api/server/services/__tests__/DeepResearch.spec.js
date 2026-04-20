jest.mock('~/config/winston', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

const { performDeepResearch } = require('../DeepResearch');

describe('DeepResearch Service', () => {
  let mockLlmCall;

  beforeEach(() => {
    mockLlmCall = jest.fn();
  });

  it('decomposes query, researches sub-questions, and synthesizes', async () => {
    // Step 1: decompose returns sub-questions
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify(['What is X?', 'How does Y work?']),
    );
    // Step 2: research each sub-question
    mockLlmCall.mockResolvedValueOnce('Finding about X');
    mockLlmCall.mockResolvedValueOnce('Finding about Y');
    // Step 3: synthesize
    mockLlmCall.mockResolvedValueOnce('# Final Report\nSynthesized findings...');

    const result = await performDeepResearch({
      query: 'Explain quantum computing',
      userId: 'user1',
      llmCall: mockLlmCall,
    });

    expect(result.subQuestions).toEqual(['What is X?', 'How does Y work?']);
    expect(result.findings).toEqual(['Finding about X', 'Finding about Y']);
    expect(result.report).toContain('Final Report');
    expect(result.totalSteps).toBe(4); // decompose + 2 research + synthesize
    expect(mockLlmCall).toHaveBeenCalledTimes(4);
  });

  it('falls back to original query when decompose JSON fails', async () => {
    mockLlmCall.mockResolvedValueOnce('Not valid JSON');
    mockLlmCall.mockResolvedValueOnce('Research finding');
    mockLlmCall.mockResolvedValueOnce('Synthesized report');

    const result = await performDeepResearch({
      query: 'Simple question',
      userId: 'user1',
      llmCall: mockLlmCall,
    });

    expect(result.subQuestions).toEqual(['Simple question']);
    expect(result.findings).toHaveLength(1);
    expect(mockLlmCall).toHaveBeenCalledTimes(3);
  });

  it('limits sub-questions to 6', async () => {
    const manyQuestions = Array.from({ length: 10 }, (_, i) => `Question ${i + 1}`);
    mockLlmCall.mockResolvedValueOnce(JSON.stringify(manyQuestions));
    // 6 research calls
    for (let i = 0; i < 6; i++) {
      mockLlmCall.mockResolvedValueOnce(`Finding ${i + 1}`);
    }
    mockLlmCall.mockResolvedValueOnce('Final report');

    const result = await performDeepResearch({
      query: 'Big topic',
      userId: 'user1',
      llmCall: mockLlmCall,
    });

    expect(result.subQuestions).toHaveLength(6);
    expect(result.findings).toHaveLength(6);
    expect(mockLlmCall).toHaveBeenCalledTimes(8); // decompose + 6 research + synthesize
  });

  it('calls onProgress callback at each stage', async () => {
    const onProgress = jest.fn();
    mockLlmCall.mockResolvedValueOnce(JSON.stringify(['Q1']));
    mockLlmCall.mockResolvedValueOnce('Finding');
    mockLlmCall.mockResolvedValueOnce('Report');

    await performDeepResearch({
      query: 'Test',
      userId: 'user1',
      llmCall: mockLlmCall,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith('decompose', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('research', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('synthesize', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('complete', expect.any(String));
  });

  it('throws on LLM error', async () => {
    mockLlmCall.mockRejectedValueOnce(new Error('LLM timeout'));

    await expect(
      performDeepResearch({
        query: 'Test',
        userId: 'user1',
        llmCall: mockLlmCall,
      }),
    ).rejects.toThrow('Deep research failed: LLM timeout');
  });

  it('handles code-fenced JSON in decompose response', async () => {
    mockLlmCall.mockResolvedValueOnce('```json\n["Q1", "Q2"]\n```');
    mockLlmCall.mockResolvedValueOnce('Finding 1');
    mockLlmCall.mockResolvedValueOnce('Finding 2');
    mockLlmCall.mockResolvedValueOnce('Report');

    const result = await performDeepResearch({
      query: 'Test',
      userId: 'user1',
      llmCall: mockLlmCall,
    });

    expect(result.subQuestions).toEqual(['Q1', 'Q2']);
  });
});
