/**
 * Seed Agent Script — Crée l'agent "Claude" par défaut
 * 
 * Usage:
 *   npx ts-node setup/seed-agent.ts
 *   
 * Ou avec Node.js:
 *   node setup/seed-agent.js
 * 
 * Ce script crée un agent par défaut avec toutes les capacités claude.ai:
 * - Artifacts activés
 * - Code Interpreter
 * - File Search
 * - Tous les MCP tools disponibles
 * - Instructions système optimisées
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration de l'agent Claude par défaut
const CLAUDE_AGENT_CONFIG = {
  id: 'claude-default',
  name: 'Claude',
  description: `Je suis Claude, un assistant IA créé par Anthropic. Je peux vous aider avec:
- 📧 Gérer vos emails (Gmail)
- 📁 Accéder à vos fichiers (Google Drive)
- 📅 Planifier des événements (Calendar)
- 📋 Gérer vos projets (Linear, GitHub)
- 💬 Communiquer avec votre équipe (Slack)
- 📝 Organiser vos notes (Notion)
- 🔍 Rechercher sur le web
- 💻 Exécuter du code
- 🎨 Créer des artifacts (React, HTML, diagrammes)`,
  
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  
  // Instructions système
  instructions: `You are Claude, a helpful AI assistant created by Anthropic. You are running inside LibreChat, which gives you access to many powerful tools and integrations.

## Your Capabilities

### MCP Tools (Model Context Protocol)
You have access to various MCP servers that let you interact with external services:
- **Gmail**: Read, search, and send emails
- **Google Drive**: List, read, create, and manage files
- **Google Calendar**: View and manage calendar events
- **Linear**: Manage issues, projects, and sprints
- **GitHub**: Access repos, issues, and pull requests
- **Slack**: Read and send messages
- **Notion**: Access pages and databases
- **Brave Search**: Search the web for current information
- **File System**: Read and write local files

### Artifacts
You can create interactive artifacts for:
- React components (use \`application/vnd.react\` type)
- HTML pages (use \`text/html\` type)
- Mermaid diagrams (use \`application/vnd.mermaid\` type)
- SVG graphics (use \`image/svg+xml\` type)

When creating artifacts, use this format:
\`\`\`
:::artifact{identifier="unique-id" type="application/vnd.react" title="My Component"}
// Your code here
:::
\`\`\`

### Code Execution
You can execute Python code to:
- Perform calculations
- Process data
- Generate visualizations
- Run algorithms

### File Search
You can search through uploaded documents to find relevant information.

## Guidelines

1. **Be helpful and proactive**: Anticipate what the user might need.
2. **Use tools appropriately**: When a task requires external data or actions, use the available tools.
3. **Confirm before actions**: Always confirm before sending emails, creating events, or modifying data.
4. **Cite sources**: When using web search, cite your sources.
5. **Create artifacts when useful**: For code, visualizations, or interactive content, create artifacts.
6. **Be concise**: Give direct answers, expand only when asked.
7. **Respect privacy**: Never share user data with third parties.

## Language
Respond in the same language as the user. If they write in French, respond in French. If English, respond in English.`,

  // Capacités de l'agent
  capabilities: {
    // Artifacts activés
    artifacts: true,
    // Code Interpreter
    execute_code: true,
    // File Search (RAG)
    file_search: true,
    // Tools MCP
    tools: true,
    // Actions (OpenAPI)
    actions: true,
  },

  // MCP Servers à utiliser
  mcpServers: [
    'gmail',
    'google-drive',
    'google-calendar',
    'linear',
    'github',
    'slack',
    'notion',
    'brave-search',
    'filesystem',
    'sequential-thinking',
  ],

  // Paramètres du modèle
  model_parameters: {
    temperature: 0.7,
    max_tokens: 8192,
    top_p: 1,
  },

  // Metadata
  isPublic: true,
  isDefault: true,
};

// Schéma Agent simplifié (basé sur les tests LibreChat)
const agentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  provider: { type: String, required: true },
  model: { type: String, required: true },
  instructions: String,
  capabilities: {
    artifacts: Boolean,
    execute_code: Boolean,
    file_search: Boolean,
    tools: Boolean,
    actions: Boolean,
  },
  mcpServers: [String],
  model_parameters: {
    temperature: Number,
    max_tokens: Number,
    top_p: Number,
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublic: Boolean,
  isDefault: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Agent = mongoose.models.Agent || mongoose.model('Agent', agentSchema);

async function seedAgent() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/LibreChat';
  
  console.log('🔌 Connexion à MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//<credentials>@')}`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');
    
    // Vérifier si l'agent existe déjà
    const existingAgent = await Agent.findOne({ id: CLAUDE_AGENT_CONFIG.id });
    
    if (existingAgent) {
      console.log('ℹ️  Agent "Claude" existe déjà, mise à jour...');
      await Agent.updateOne(
        { id: CLAUDE_AGENT_CONFIG.id },
        { $set: { ...CLAUDE_AGENT_CONFIG, updatedAt: new Date() } }
      );
      console.log('✅ Agent "Claude" mis à jour');
    } else {
      console.log('📝 Création de l\'agent "Claude"...');
      await Agent.create(CLAUDE_AGENT_CONFIG);
      console.log('✅ Agent "Claude" créé');
    }
    
    // Afficher les détails
    const agent = await Agent.findOne({ id: CLAUDE_AGENT_CONFIG.id });
    console.log('\n📋 Détails de l\'agent:');
    console.log(`   ID: ${agent.id}`);
    console.log(`   Nom: ${agent.name}`);
    console.log(`   Provider: ${agent.provider}`);
    console.log(`   Modèle: ${agent.model}`);
    console.log(`   MCP Servers: ${agent.mcpServers?.join(', ') || 'aucun'}`);
    console.log(`   Artifacts: ${agent.capabilities?.artifacts ? '✓' : '✗'}`);
    console.log(`   Code Interpreter: ${agent.capabilities?.execute_code ? '✓' : '✗'}`);
    console.log(`   File Search: ${agent.capabilities?.file_search ? '✓' : '✗'}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Exécuter
seedAgent().then(() => {
  console.log('\n🎉 Seed terminé avec succès!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

export { CLAUDE_AGENT_CONFIG, seedAgent };
