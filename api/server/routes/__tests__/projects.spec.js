const express = require('express');
const request = require('supertest');

const mockListProjects = jest.fn();
const mockGetProject = jest.fn();
const mockCreateProject = jest.fn();
const mockUpdateProject = jest.fn();
const mockDeleteProject = jest.fn();

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (_req, _res, next) => next(),
}));

jest.mock('~/models', () => ({
  listProjects: (...args) => mockListProjects(...args),
  getProject: (...args) => mockGetProject(...args),
  createProject: (...args) => mockCreateProject(...args),
  updateProject: (...args) => mockUpdateProject(...args),
  deleteProject: (...args) => mockDeleteProject(...args),
}));

const projectsRouter = require('../projects');

function createApp(user = { id: 'user1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/projects', projectsRouter);
  return app;
}

const sampleProject = {
  _id: 'proj1',
  userId: 'user1',
  name: 'Test Project',
  description: 'A test project',
  knowledgeFileIds: [],
  color: '#3b82f6',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/projects', () => {
  it('lists projects for the user', async () => {
    mockListProjects.mockResolvedValue([sampleProject]);
    const app = createApp();

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockListProjects).toHaveBeenCalledWith({
      userId: 'user1',
      includeArchived: false,
    });
  });

  it('includes archived when query param is set', async () => {
    mockListProjects.mockResolvedValue([]);
    const app = createApp();

    const res = await request(app).get('/api/projects?includeArchived=true');

    expect(res.status).toBe(200);
    expect(mockListProjects).toHaveBeenCalledWith({
      userId: 'user1',
      includeArchived: true,
    });
  });

  it('returns 500 on error', async () => {
    mockListProjects.mockRejectedValue(new Error('DB error'));
    const app = createApp();

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/projects/:projectId', () => {
  it('returns a project', async () => {
    mockGetProject.mockResolvedValue(sampleProject);
    const app = createApp();

    const res = await request(app).get('/api/projects/proj1');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Project');
  });

  it('returns 404 when not found', async () => {
    mockGetProject.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/projects/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects', () => {
  it('creates a project', async () => {
    mockCreateProject.mockResolvedValue(sampleProject);
    const app = createApp();

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Project');
  });

  it('returns 400 when name is missing', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/projects')
      .send({ description: 'no name' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Project name is required');
  });

  it('returns 400 when name is too long', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'x'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Project name must be 200 characters or less');
  });

  it('returns 409 on duplicate name', async () => {
    mockCreateProject.mockRejectedValue(new Error('already exists'));
    const app = createApp();

    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Existing' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/projects/:projectId', () => {
  it('updates a project', async () => {
    mockUpdateProject.mockResolvedValue({ ...sampleProject, name: 'Updated' });
    const app = createApp();

    const res = await request(app)
      .patch('/api/projects/proj1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 400 when name is empty string', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/projects/proj1')
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    mockUpdateProject.mockResolvedValue(null);
    const app = createApp();

    const res = await request(app)
      .patch('/api/projects/nonexistent')
      .send({ name: 'Update' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/projects/:projectId', () => {
  it('deletes a project', async () => {
    mockDeleteProject.mockResolvedValue({ ok: true });
    const app = createApp();

    const res = await request(app).delete('/api/projects/proj1');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Project deleted');
  });

  it('returns 404 when project not found', async () => {
    mockDeleteProject.mockResolvedValue({ ok: false });
    const app = createApp();

    const res = await request(app).delete('/api/projects/nonexistent');

    expect(res.status).toBe(404);
  });
});
