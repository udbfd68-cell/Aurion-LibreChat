const express = require('express');
const request = require('supertest');

const mockPerformDeepResearch = jest.fn();
const mockSaveArtifact = jest.fn();

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (_req, _res, next) => next(),
}));

jest.mock('~/server/services/DeepResearch', () => ({
  performDeepResearch: (...args) => mockPerformDeepResearch(...args),
}));

jest.mock('~/models', () => ({
  saveArtifact: (...args) => mockSaveArtifact(...args),
}));

const deepResearchRouter = require('../deepResearch');

function createApp(user = { id: 'user1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/deep-research', deepResearchRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/deep-research', () => {
  it('returns 400 when query is missing', async () => {
    const app = createApp();

    const res = await request(app).post('/api/deep-research').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Research query is required');
  });

  it('returns 400 when query is empty string', async () => {
    const app = createApp();

    const res = await request(app).post('/api/deep-research').send({ query: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Research query is required');
  });

  it('returns 400 when query exceeds 2000 characters', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/deep-research')
      .send({ query: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Query must be 2000 characters or less');
  });

  it('performs research and returns result', async () => {
    mockPerformDeepResearch.mockResolvedValue({
      report: '# Research Report\nFindings...',
      subQuestions: ['What is X?', 'How does Y work?'],
      totalSteps: 3,
    });
    const app = createApp();

    const res = await request(app)
      .post('/api/deep-research')
      .send({ query: 'Explain quantum computing' });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe('Explain quantum computing');
    expect(res.body.report).toContain('Research Report');
    expect(res.body.subQuestions).toHaveLength(2);
    expect(res.body.totalSteps).toBe(3);
  });

  it('saves artifact when conversationId is provided', async () => {
    mockPerformDeepResearch.mockResolvedValue({
      report: 'Report',
      subQuestions: [],
      totalSteps: 1,
    });
    mockSaveArtifact.mockResolvedValue({});
    const app = createApp();

    await request(app)
      .post('/api/deep-research')
      .send({ query: 'Test query', conversationId: 'conv1' });

    expect(mockSaveArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        conversationId: 'conv1',
        type: 'text/markdown',
        content: 'Report',
      }),
    );
  });

  it('does not save artifact when conversationId is not provided', async () => {
    mockPerformDeepResearch.mockResolvedValue({
      report: 'Report',
      subQuestions: [],
      totalSteps: 1,
    });
    const app = createApp();

    await request(app)
      .post('/api/deep-research')
      .send({ query: 'Test query' });

    expect(mockSaveArtifact).not.toHaveBeenCalled();
  });

  it('returns 500 on research failure', async () => {
    mockPerformDeepResearch.mockRejectedValue(new Error('LLM failed'));
    const app = createApp();

    const res = await request(app)
      .post('/api/deep-research')
      .send({ query: 'Test' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('LLM failed');
  });
});
