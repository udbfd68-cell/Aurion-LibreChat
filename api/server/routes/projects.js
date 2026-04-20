const express = require('express');
const {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const projectPayloadLimit = express.json({ limit: '50kb' });

// List all projects for the authenticated user
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const projects = await listProjects({
      userId: req.user.id,
      includeArchived,
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list projects' });
  }
});

// Get a single project
router.get('/:projectId', requireJwtAuth, async (req, res) => {
  try {
    const project = await getProject({
      projectId: req.params.projectId,
      userId: req.user.id,
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get project' });
  }
});

// Create a new project
router.post('/', requireJwtAuth, projectPayloadLimit, async (req, res) => {
  try {
    const { name, description, customInstructions, knowledgeFileIds, color, icon } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    if (name.length > 200) {
      return res.status(400).json({ message: 'Project name must be 200 characters or less' });
    }
    const project = await createProject({
      userId: req.user.id,
      name: name.trim(),
      description: description?.slice(0, 2000),
      customInstructions: customInstructions?.slice(0, 10000),
      knowledgeFileIds: Array.isArray(knowledgeFileIds) ? knowledgeFileIds : [],
      color,
      icon,
    });
    res.status(201).json(project);
  } catch (error) {
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to create project' });
  }
});

// Update a project
router.patch('/:projectId', requireJwtAuth, projectPayloadLimit, async (req, res) => {
  try {
    const { name, description, customInstructions, knowledgeFileIds, color, icon, archivedAt } =
      req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ message: 'Project name cannot be empty' });
    }
    if (name !== undefined && name.length > 200) {
      return res.status(400).json({ message: 'Project name must be 200 characters or less' });
    }
    const project = await updateProject({
      projectId: req.params.projectId,
      userId: req.user.id,
      name: name?.trim(),
      description: description?.slice(0, 2000),
      customInstructions: customInstructions?.slice(0, 10000),
      knowledgeFileIds: Array.isArray(knowledgeFileIds) ? knowledgeFileIds : undefined,
      color,
      icon,
      archivedAt: archivedAt === null ? null : archivedAt ? new Date(archivedAt) : undefined,
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update project' });
  }
});

// Delete a project
router.delete('/:projectId', requireJwtAuth, async (req, res) => {
  try {
    const result = await deleteProject({
      projectId: req.params.projectId,
      userId: req.user.id,
    });
    if (!result.ok) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete project' });
  }
});

module.exports = router;
