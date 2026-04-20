const express = require('express');
const {
  saveArtifact,
  getArtifact,
  listArtifacts,
  getArtifactVersions,
  shareArtifact,
  getSharedArtifact,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const artifactPayloadLimit = express.json({ limit: '2mb' });

// List artifacts for the authenticated user (optionally by conversation)
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const artifacts = await listArtifacts({
      userId: req.user.id,
      conversationId: req.query.conversationId || undefined,
    });
    res.json(artifacts);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list artifacts' });
  }
});

// Get a shared artifact (public, no auth required)
router.get('/shared/:shareId', async (req, res) => {
  try {
    const artifact = await getSharedArtifact({ shareId: req.params.shareId });
    if (!artifact) {
      return res.status(404).json({ message: 'Shared artifact not found' });
    }
    res.json(artifact);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get shared artifact' });
  }
});

// Get versions of an artifact by identifier
router.get('/versions/:identifier', requireJwtAuth, async (req, res) => {
  try {
    const versions = await getArtifactVersions({
      userId: req.user.id,
      identifier: req.params.identifier,
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get artifact versions' });
  }
});

// Get a single artifact
router.get('/:artifactId', requireJwtAuth, async (req, res) => {
  try {
    const artifact = await getArtifact({
      artifactId: req.params.artifactId,
      userId: req.user.id,
    });
    if (!artifact) {
      return res.status(404).json({ message: 'Artifact not found' });
    }
    res.json(artifact);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get artifact' });
  }
});

// Save a new artifact version
router.post('/', requireJwtAuth, artifactPayloadLimit, async (req, res) => {
  try {
    const { conversationId, messageId, identifier, title, type, language, content } = req.body;
    if (!conversationId || !messageId || !identifier || !title || !type || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (title.length > 500) {
      return res.status(400).json({ message: 'Title must be 500 characters or less' });
    }
    const artifact = await saveArtifact({
      userId: req.user.id,
      conversationId,
      messageId,
      identifier,
      title: title.slice(0, 500),
      type,
      language,
      content,
    });
    res.status(201).json(artifact);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to save artifact' });
  }
});

// Share/unshare an artifact
router.patch('/:artifactId/share', requireJwtAuth, express.json(), async (req, res) => {
  try {
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'isPublic must be a boolean' });
    }
    const artifact = await shareArtifact({
      artifactId: req.params.artifactId,
      userId: req.user.id,
      isPublic,
    });
    if (!artifact) {
      return res.status(404).json({ message: 'Artifact not found' });
    }
    res.json(artifact);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to share artifact' });
  }
});

// Get embed code for a published artifact
router.get('/:artifactId/embed', requireJwtAuth, async (req, res) => {
  try {
    const artifact = await getArtifact({
      artifactId: req.params.artifactId,
      userId: req.user.id,
    });
    if (!artifact) {
      return res.status(404).json({ message: 'Artifact not found' });
    }
    if (!artifact.isPublic || !artifact.shareId) {
      return res.status(400).json({ message: 'Artifact must be published to get embed code' });
    }
    const domain = process.env.DOMAIN_CLIENT || req.headers.origin || '';
    const embedUrl = `${domain}/share/artifact/${artifact.shareId}`;
    const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" sandbox="allow-scripts allow-same-origin" style="border-radius: 8px; border: 1px solid #e5e7eb;"></iframe>`;
    res.json({ embedUrl, embedCode, shareId: artifact.shareId });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get embed code' });
  }
});

// Customize (fork) an artifact into a new conversation
router.post('/:artifactId/customize', requireJwtAuth, express.json(), async (req, res) => {
  try {
    const original = await getArtifact({
      artifactId: req.params.artifactId,
    });
    if (!original) {
      return res.status(404).json({ message: 'Artifact not found' });
    }
    if (!original.isPublic && String(original.userId) !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const customized = await saveArtifact({
      userId: req.user.id,
      conversationId: req.body.conversationId || `custom_${Date.now()}`,
      messageId: `customized_${Date.now()}`,
      identifier: `${original.identifier}_custom_${Date.now()}`,
      title: original.title,
      type: original.type,
      language: original.language,
      content: original.content,
    });
    res.status(201).json(customized);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to customize artifact' });
  }
});

// Get curated inspiration artifacts
router.get('/gallery/inspiration', async (req, res) => {
  try {
    const inspirationArtifacts = [
      {
        id: 'insp-1',
        title: 'Interactive Data Dashboard',
        type: 'application/vnd.ant.react',
        category: 'Be creative',
        description: 'A React dashboard with charts, filters, and live data visualization',
        prompt: 'Create an interactive dashboard with sample sales data, charts using recharts, and filter controls',
      },
      {
        id: 'insp-2',
        title: 'Pomodoro Timer',
        type: 'application/vnd.ant.react',
        category: 'Life hacks',
        description: 'A beautiful Pomodoro timer with work/break cycles and sound notifications',
        prompt: 'Build a Pomodoro timer app with customizable work/break durations, a circular progress indicator, and session tracking',
      },
      {
        id: 'insp-3',
        title: 'Markdown Note Editor',
        type: 'application/vnd.ant.react',
        category: 'Be creative',
        description: 'A split-pane markdown editor with live preview',
        prompt: 'Create a markdown editor with a split view showing source on the left and rendered preview on the right',
      },
      {
        id: 'insp-4',
        title: 'Flashcard Study App',
        type: 'application/vnd.ant.react',
        category: 'Learn something',
        description: 'An interactive flashcard app with spaced repetition',
        prompt: 'Build a flashcard study app where users can add cards, flip them, and track their progress with spaced repetition',
      },
      {
        id: 'insp-5',
        title: 'API Documentation',
        type: 'text/markdown',
        category: 'Learn something',
        description: 'A comprehensive API documentation template with endpoints, examples, and schemas',
        prompt: 'Generate a complete REST API documentation for a task management system with authentication, CRUD operations, and pagination',
      },
      {
        id: 'insp-6',
        title: 'SVG Illustration Generator',
        type: 'image/svg+xml',
        category: 'Be creative',
        description: 'Generate beautiful SVG illustrations for landing pages',
        prompt: 'Create an SVG illustration of a modern workspace with a laptop, coffee cup, and plant in a minimalist flat design style',
      },
      {
        id: 'insp-7',
        title: 'Budget Tracker',
        type: 'application/vnd.ant.react',
        category: 'Life hacks',
        description: 'A personal budget tracker with expense categories and monthly summaries',
        prompt: 'Build a budget tracker app with expense entry, category pie charts, monthly totals, and a remaining budget indicator',
      },
      {
        id: 'insp-8',
        title: 'System Architecture Diagram',
        type: 'application/vnd.ant.mermaid',
        category: 'Learn something',
        description: 'A Mermaid diagram showing microservices architecture',
        prompt: 'Create a system architecture diagram for an e-commerce platform with microservices, message queues, databases, and CDN',
      },
    ];
    res.json(inspirationArtifacts);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load inspiration' });
  }
});

module.exports = router;
