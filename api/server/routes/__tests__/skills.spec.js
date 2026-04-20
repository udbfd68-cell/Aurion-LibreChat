const express = require('express');
const request = require('supertest');

const mockListSkills = jest.fn();
const mockGetSkill = jest.fn();
const mockCreateSkill = jest.fn();
const mockUpdateSkill = jest.fn();
const mockDeleteSkill = jest.fn();

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (_req, _res, next) => next(),
}));

jest.mock('~/models', () => ({
  listSkills: (...args) => mockListSkills(...args),
  getSkill: (...args) => mockGetSkill(...args),
  createSkill: (...args) => mockCreateSkill(...args),
  updateSkill: (...args) => mockUpdateSkill(...args),
  deleteSkill: (...args) => mockDeleteSkill(...args),
}));

const skillsRouter = require('../skills');

function createApp(user = { id: 'user1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/skills', skillsRouter);
  return app;
}

const builtInSkill = {
  _id: 'skill1',
  name: 'Analysis',
  description: 'Deep analytical thinking',
  systemPrompt: 'You are an analyst.',
  icon: '🔍',
  color: '#3b82f6',
  category: 'reasoning',
  isBuiltIn: true,
  isPublic: true,
  tools: [],
};

const customSkill = {
  _id: 'skill2',
  userId: 'user1',
  name: 'My Custom Skill',
  description: 'A custom skill',
  systemPrompt: 'Custom instructions',
  icon: '⚡',
  color: '#10b981',
  category: 'general',
  isBuiltIn: false,
  isPublic: false,
  tools: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/skills', () => {
  it('returns all skills for the user', async () => {
    mockListSkills.mockResolvedValue([builtInSkill, customSkill]);
    const app = createApp();

    const res = await request(app).get('/api/skills');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockListSkills).toHaveBeenCalledWith({
      userId: 'user1',
      category: undefined,
    });
  });

  it('filters by category when provided', async () => {
    mockListSkills.mockResolvedValue([builtInSkill]);
    const app = createApp();

    const res = await request(app).get('/api/skills?category=reasoning');

    expect(res.status).toBe(200);
    expect(mockListSkills).toHaveBeenCalledWith({
      userId: 'user1',
      category: 'reasoning',
    });
  });

  it('returns 500 when listSkills throws', async () => {
    mockListSkills.mockRejectedValue(new Error('DB error'));
    const app = createApp();

    const res = await request(app).get('/api/skills');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('DB error');
  });
});

describe('GET /api/skills/:skillId', () => {
  it('returns a specific skill', async () => {
    mockGetSkill.mockResolvedValue(builtInSkill);
    const app = createApp();

    const res = await request(app).get('/api/skills/skill1');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Analysis');
    expect(mockGetSkill).toHaveBeenCalledWith({
      skillId: 'skill1',
      userId: 'user1',
    });
  });

  it('returns 404 when skill not found', async () => {
    mockGetSkill.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/skills/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Skill not found');
  });
});

describe('POST /api/skills', () => {
  it('creates a skill with valid data', async () => {
    mockCreateSkill.mockResolvedValue(customSkill);
    const app = createApp();

    const res = await request(app)
      .post('/api/skills')
      .send({
        name: 'My Custom Skill',
        description: 'A custom skill',
        systemPrompt: 'Custom instructions',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Custom Skill');
    expect(mockCreateSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        name: 'My Custom Skill',
        description: 'A custom skill',
        systemPrompt: 'Custom instructions',
      }),
    );
  });

  it('returns 400 when name is missing', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/skills')
      .send({ description: 'test', systemPrompt: 'test' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Skill name is required');
  });

  it('returns 400 when description is missing', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/skills')
      .send({ name: 'test', systemPrompt: 'test' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Skill description is required');
  });

  it('returns 400 when systemPrompt is missing', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/skills')
      .send({ name: 'test', description: 'test' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('System prompt is required');
  });

  it('returns 409 when skill name already exists', async () => {
    mockCreateSkill.mockRejectedValue(new Error('A skill with this name already exists'));
    const app = createApp();

    const res = await request(app)
      .post('/api/skills')
      .send({ name: 'Analysis', description: 'test', systemPrompt: 'test' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/skills/:skillId', () => {
  it('updates a skill', async () => {
    mockUpdateSkill.mockResolvedValue({ ...customSkill, name: 'Updated Name' });
    const app = createApp();

    const res = await request(app)
      .patch('/api/skills/skill2')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(mockUpdateSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: 'skill2',
        userId: 'user1',
        name: 'Updated Name',
      }),
    );
  });

  it('returns 404 when skill not found or is built-in', async () => {
    mockUpdateSkill.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app)
      .patch('/api/skills/skill1')
      .send({ name: 'Try Update' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/skills/:skillId', () => {
  it('deletes a custom skill', async () => {
    mockDeleteSkill.mockResolvedValue({ ok: true });
    const app = createApp();

    const res = await request(app).delete('/api/skills/skill2');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Skill deleted');
  });

  it('returns 404 when skill not found or is built-in', async () => {
    mockDeleteSkill.mockResolvedValue({ ok: false });
    const app = createApp();

    const res = await request(app).delete('/api/skills/skill1');

    expect(res.status).toBe(404);
  });
});
