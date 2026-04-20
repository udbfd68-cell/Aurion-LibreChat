const express = require('express');
const {
  createSkill,
  getSkill,
  listSkills,
  updateSkill,
  deleteSkill,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const skillPayloadLimit = express.json({ limit: '100kb' });

// List all available skills (built-in + user's own + public)
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const skills = await listSkills({
      userId: req.user.id,
      category: req.query.category || undefined,
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list skills' });
  }
});

// Get a single skill
router.get('/:skillId', requireJwtAuth, async (req, res) => {
  try {
    const skill = await getSkill({
      skillId: req.params.skillId,
      userId: req.user.id,
    });
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get skill' });
  }
});

// Create a custom skill
router.post('/', requireJwtAuth, skillPayloadLimit, async (req, res) => {
  try {
    const { name, description, systemPrompt, icon, color, category, tools, modelConfig } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Skill name is required' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'Skill description is required' });
    }
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return res.status(400).json({ message: 'System prompt is required' });
    }
    const skill = await createSkill({
      userId: req.user.id,
      name: name.trim().slice(0, 200),
      description: description.slice(0, 2000),
      systemPrompt: systemPrompt.slice(0, 50000),
      icon,
      color,
      category: category?.slice(0, 50),
      tools: Array.isArray(tools) ? tools : [],
      modelConfig,
    });
    res.status(201).json(skill);
  } catch (error) {
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to create skill' });
  }
});

// Update a custom skill (cannot update built-in)
router.patch('/:skillId', requireJwtAuth, skillPayloadLimit, async (req, res) => {
  try {
    const { name, description, systemPrompt, icon, color, category, tools, modelConfig } = req.body;
    const skill = await updateSkill({
      skillId: req.params.skillId,
      userId: req.user.id,
      name: name?.trim()?.slice(0, 200),
      description: description?.slice(0, 2000),
      systemPrompt: systemPrompt?.slice(0, 50000),
      icon,
      color,
      category: category?.slice(0, 50),
      tools: Array.isArray(tools) ? tools : undefined,
      modelConfig,
    });
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found or cannot be modified' });
    }
    res.json(skill);
  } catch (error) {
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update skill' });
  }
});

// Delete a custom skill
router.delete('/:skillId', requireJwtAuth, async (req, res) => {
  try {
    const result = await deleteSkill({
      skillId: req.params.skillId,
      userId: req.user.id,
    });
    if (!result.ok) {
      return res.status(404).json({ message: 'Skill not found or cannot be deleted' });
    }
    res.json({ message: 'Skill deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete skill' });
  }
});

module.exports = router;
