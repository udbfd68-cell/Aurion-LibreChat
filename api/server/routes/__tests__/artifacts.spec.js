const express = require('express');
const request = require('supertest');

const mockListArtifacts = jest.fn();
const mockGetArtifact = jest.fn();
const mockSaveArtifact = jest.fn();
const mockShareArtifact = jest.fn();
const mockGetSharedArtifact = jest.fn();
const mockGetArtifactVersions = jest.fn();

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (_req, _res, next) => next(),
}));

jest.mock('~/models', () => ({
  listArtifacts: (...args) => mockListArtifacts(...args),
  getArtifact: (...args) => mockGetArtifact(...args),
  saveArtifact: (...args) => mockSaveArtifact(...args),
  shareArtifact: (...args) => mockShareArtifact(...args),
  getSharedArtifact: (...args) => mockGetSharedArtifact(...args),
  getArtifactVersions: (...args) => mockGetArtifactVersions(...args),
}));

const artifactsRouter = require('../artifacts');

function createApp(user = { id: 'user1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/artifacts', artifactsRouter);
  return app;
}

const sampleArtifact = {
  _id: 'art1',
  userId: 'user1',
  conversationId: 'conv1',
  messageId: 'msg1',
  identifier: 'react-app-1',
  title: 'React App',
  type: 'application/vnd.react',
  content: '<div>Hello</div>',
  version: 1,
  isPublic: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/artifacts', () => {
  it('lists artifacts for the user', async () => {
    mockListArtifacts.mockResolvedValue([sampleArtifact]);
    const app = createApp();

    const res = await request(app).get('/api/artifacts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockListArtifacts).toHaveBeenCalledWith({
      userId: 'user1',
      conversationId: undefined,
    });
  });

  it('filters by conversationId', async () => {
    mockListArtifacts.mockResolvedValue([sampleArtifact]);
    const app = createApp();

    const res = await request(app).get('/api/artifacts?conversationId=conv1');

    expect(res.status).toBe(200);
    expect(mockListArtifacts).toHaveBeenCalledWith({
      userId: 'user1',
      conversationId: 'conv1',
    });
  });
});

describe('GET /api/artifacts/shared/:shareId', () => {
  it('returns a shared artifact', async () => {
    mockGetSharedArtifact.mockResolvedValue({ ...sampleArtifact, isPublic: true, shareId: 'abc' });
    const app = createApp();

    const res = await request(app).get('/api/artifacts/shared/abc');

    expect(res.status).toBe(200);
    expect(res.body.shareId).toBe('abc');
  });

  it('returns 404 when shared artifact not found', async () => {
    mockGetSharedArtifact.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/artifacts/shared/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/artifacts/versions/:identifier', () => {
  it('returns artifact versions', async () => {
    const v1 = { ...sampleArtifact, version: 1 };
    const v2 = { ...sampleArtifact, _id: 'art2', version: 2 };
    mockGetArtifactVersions.mockResolvedValue([v1, v2]);
    const app = createApp();

    const res = await request(app).get('/api/artifacts/versions/react-app-1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/artifacts/:artifactId', () => {
  it('returns a specific artifact', async () => {
    mockGetArtifact.mockResolvedValue(sampleArtifact);
    const app = createApp();

    const res = await request(app).get('/api/artifacts/art1');

    expect(res.status).toBe(200);
    expect(res.body.identifier).toBe('react-app-1');
  });

  it('returns 404 when artifact not found', async () => {
    mockGetArtifact.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/artifacts/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/artifacts', () => {
  it('saves a new artifact', async () => {
    mockSaveArtifact.mockResolvedValue(sampleArtifact);
    const app = createApp();

    const res = await request(app).post('/api/artifacts').send({
      conversationId: 'conv1',
      messageId: 'msg1',
      identifier: 'react-app-1',
      title: 'React App',
      type: 'application/vnd.react',
      content: '<div>Hello</div>',
    });

    expect(res.status).toBe(201);
    expect(res.body.identifier).toBe('react-app-1');
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();

    const res = await request(app).post('/api/artifacts').send({
      conversationId: 'conv1',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required fields');
  });

  it('returns 400 when title is too long', async () => {
    const app = createApp();

    const res = await request(app).post('/api/artifacts').send({
      conversationId: 'conv1',
      messageId: 'msg1',
      identifier: 'test',
      title: 'x'.repeat(501),
      type: 'text',
      content: 'hi',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Title must be 500 characters or less');
  });
});

describe('PATCH /api/artifacts/:artifactId/share', () => {
  it('shares an artifact', async () => {
    mockShareArtifact.mockResolvedValue({ ...sampleArtifact, isPublic: true, shareId: 'xyz' });
    const app = createApp();

    const res = await request(app)
      .patch('/api/artifacts/art1/share')
      .send({ isPublic: true });

    expect(res.status).toBe(200);
    expect(res.body.isPublic).toBe(true);
  });

  it('returns 400 when isPublic is not boolean', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/artifacts/art1/share')
      .send({ isPublic: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('isPublic must be a boolean');
  });

  it('returns 404 when artifact not found', async () => {
    mockShareArtifact.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app)
      .patch('/api/artifacts/nonexistent/share')
      .send({ isPublic: true });

    expect(res.status).toBe(404);
  });
});
