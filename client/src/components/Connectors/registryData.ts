/**
 * Static MCP Registry â€” curated honest list.
 * Only remoteUrl set for verified vendor-hosted MCP with real OAuth.
 */

export interface RegistryServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  transportType: string;
  command?: string;
  args?: string[];
  authType?: string;
  requiredEnv: string[];
  docsUrl: string;
  featured: boolean;
  remoteUrl?: string;
  vendorOfficial?: boolean;
}

export interface RegistryCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const MCP_SERVERS: RegistryServer[] = [
  // VENDOR-OFFICIAL HOSTED MCP WITH REAL OAUTH (verified April 2026)
  { id: 'linear', name: 'Linear', description: 'Issues, projets, cycles, triage â€” OAuth Linear officiel', icon: 'kanban', category: 'developer', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://linear.app/docs/mcp', featured: true, remoteUrl: 'https://mcp.linear.app/sse', vendorOfficial: true },
  { id: 'notion', name: 'Notion', description: 'Pages, bases de donnÃ©es, blocs, commentaires â€” OAuth Notion officiel', icon: 'file-text', category: 'productivity', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developers.notion.com/docs/mcp', featured: true, remoteUrl: 'https://mcp.notion.com/mcp', vendorOfficial: true },
  { id: 'atlassian', name: 'Atlassian (Jira + Confluence)', description: 'Tickets Jira, pages Confluence, sprints â€” OAuth Atlassian officiel', icon: 'target', category: 'productivity', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://support.atlassian.com/rovo/docs/setting-up-the-atlassian-remote-mcp-server/', featured: true, remoteUrl: 'https://mcp.atlassian.com/v1/sse', vendorOfficial: true },
  { id: 'github', name: 'GitHub', description: 'Repos, issues, PRs, actions, code search â€” GitHub Copilot MCP officiel', icon: 'github', category: 'developer', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://github.com/github/github-mcp-server', featured: true, remoteUrl: 'https://api.githubcopilot.com/mcp/', vendorOfficial: true },
  { id: 'stripe', name: 'Stripe', description: 'Paiements, clients, abonnements, factures â€” OAuth Stripe officiel', icon: 'credit-card', category: 'finance', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://docs.stripe.com/mcp', featured: true, remoteUrl: 'https://mcp.stripe.com', vendorOfficial: true },
  { id: 'sentry', name: 'Sentry', description: 'Tracking erreurs, monitoring, issues â€” OAuth Sentry officiel', icon: 'bug', category: 'developer', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://docs.sentry.io/product/sentry-mcp/', featured: false, remoteUrl: 'https://mcp.sentry.dev/mcp', vendorOfficial: true },
  { id: 'asana', name: 'Asana', description: 'TÃ¢ches, projets, Ã©quipes, portefeuilles â€” OAuth Asana officiel', icon: 'check-circle', category: 'productivity', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developers.asana.com/docs/mcp-server', featured: false, remoteUrl: 'https://mcp.asana.com/sse', vendorOfficial: true },
  { id: 'paypal', name: 'PayPal', description: 'Paiements, factures, transactions â€” OAuth PayPal officiel', icon: 'credit-card', category: 'finance', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developer.paypal.com/tools/mcp-server/', featured: false, remoteUrl: 'https://mcp.paypal.com/sse', vendorOfficial: true },
  { id: 'square', name: 'Square', description: 'Paiements, abonnements, factures, TPE â€” OAuth Square officiel', icon: 'credit-card', category: 'finance', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developer.squareup.com/docs/mcp', featured: false, remoteUrl: 'https://mcp.squareup.com/sse', vendorOfficial: true },
  { id: 'intercom', name: 'Intercom', description: 'Chat live, tickets support â€” OAuth Intercom officiel', icon: 'message-square', category: 'support', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developers.intercom.com/docs/guides/mcp', featured: false, remoteUrl: 'https://mcp.intercom.com/sse', vendorOfficial: true },
  { id: 'cloudflare', name: 'Cloudflare', description: 'Workers, R2, KV, D1, DNS, docs â€” OAuth Cloudflare officiel', icon: 'cloud-lightning', category: 'cloud', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://developers.cloudflare.com/agents/model-context-protocol/', featured: false, remoteUrl: 'https://docs.mcp.cloudflare.com/mcp', vendorOfficial: true },
  { id: 'vercel', name: 'Vercel', description: 'DÃ©ploiements, projets, domaines, debug â€” OAuth Vercel officiel', icon: 'triangle', category: 'cloud', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://vercel.com/docs/mcp', featured: false, remoteUrl: 'https://mcp.vercel.com/', vendorOfficial: true },
  { id: 'shopify', name: 'Shopify', description: 'Produits, commandes, stock, clients â€” OAuth Shopify officiel', icon: 'shopping-bag', category: 'ecommerce', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://shopify.dev/docs/apps/build/mcp', featured: true, remoteUrl: 'https://mcp.shopify.com/mcp', vendorOfficial: true },
  { id: 'neon', name: 'Neon', description: 'Postgres serverless â€” branches, queries â€” OAuth Neon officiel', icon: 'waves', category: 'database', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://neon.com/docs/ai/neon-mcp-server', featured: false, remoteUrl: 'https://mcp.neon.tech/sse', vendorOfficial: true },
  { id: 'planetscale', name: 'PlanetScale', description: 'MySQL branches, SQL, performance â€” OAuth PlanetScale officiel', icon: 'database', category: 'database', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://planetscale.com/docs/connect/mcp', featured: false, remoteUrl: 'https://mcp.planetscale.com/mcp', vendorOfficial: true },
  { id: 'canva', name: 'Canva', description: 'Design, prÃ©sentations, templates â€” OAuth Canva officiel', icon: 'palette', category: 'design', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://www.canva.dev/docs/apps/mcp/', featured: false, remoteUrl: 'https://mcp.canva.com/mcp', vendorOfficial: true },
  { id: 'zapier', name: 'Zapier (Gmail, Slack, Drive, 7000+)', description: 'Proxy OAuth universel â€” Gmail, Slack, Google Drive, Calendar, Salesforce et 7000+ services via une connexion Zapier', icon: 'zap', category: 'productivity', transportType: 'streamable-http', authType: 'oauth', requiredEnv: [], docsUrl: 'https://zapier.com/mcp', featured: true, remoteUrl: 'https://mcp.zapier.com/api/mcp/mcp', vendorOfficial: true },
  { id: 'deepwiki', name: 'DeepWiki', description: 'Documentation IA pour tout repo GitHub â€” sans auth', icon: 'book-open', category: 'knowledge', transportType: 'streamable-http', requiredEnv: [], docsUrl: 'https://deepwiki.com', featured: true, remoteUrl: 'https://mcp.deepwiki.com/mcp', vendorOfficial: true },

  // STDIO SERVERS â€” local npx install
  { id: 'postgres', name: 'PostgreSQL', description: 'Query PostgreSQL (local)', icon: 'database', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'], requiredEnv: ['POSTGRES_URL'], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', featured: false },
  { id: 'sqlite', name: 'SQLite', description: 'Query SQLite databases with schema introspection', icon: 'hard-drive', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', featured: false },
  { id: 'mysql', name: 'MySQL', description: 'Query MySQL databases', icon: 'database', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', 'mysql-mcp-server'], requiredEnv: ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'], docsUrl: 'https://github.com/designcomputer/mysql_mcp_server', featured: false },
  { id: 'mongodb', name: 'MongoDB', description: 'Query MongoDB collections, aggregations', icon: 'leaf', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-mongo-server'], requiredEnv: ['MONGODB_URI'], docsUrl: 'https://github.com/kiliczsh/mcp-mongo-server', featured: false },
  { id: 'redis', name: 'Redis', description: 'Interact with Redis â€” keys, patterns', icon: 'circle-dot', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', '@redis/mcp-server'], requiredEnv: ['REDIS_URL'], docsUrl: 'https://github.com/redis/mcp-redis', featured: false },
  { id: 'qdrant', name: 'Qdrant', description: 'Vector database â€” semantic search', icon: 'hexagon', category: 'database', transportType: 'stdio', command: 'npx', args: ['-y', '@qdrant/mcp-server-qdrant'], requiredEnv: ['QDRANT_URL', 'QDRANT_API_KEY'], docsUrl: 'https://github.com/qdrant/mcp-server-qdrant', featured: false },
  { id: 'brave-search', name: 'Brave Search', description: 'Web + local search API (BRAVE_API_KEY)', icon: 'search', category: 'search', transportType: 'stdio', command: 'npx', args: ['-y', '@brave/brave-search-mcp-server'], requiredEnv: ['BRAVE_API_KEY'], docsUrl: 'https://github.com/brave/brave-search-mcp-server', featured: true },
  { id: 'fetch', name: 'Fetch', description: 'Fetch URL + convert HTML to markdown', icon: 'globe', category: 'search', transportType: 'stdio', command: 'uvx', args: ['mcp-server-fetch'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', featured: true },
  { id: 'exa', name: 'Exa', description: 'AI-powered web search', icon: 'radar', category: 'search', transportType: 'stdio', command: 'npx', args: ['-y', 'exa-mcp-server'], requiredEnv: ['EXA_API_KEY'], docsUrl: 'https://github.com/exa-labs/exa-mcp-server', featured: true },
  { id: 'firecrawl', name: 'Firecrawl', description: 'Web scraping', icon: 'flame', category: 'search', transportType: 'stdio', command: 'npx', args: ['-y', 'firecrawl-mcp'], requiredEnv: ['FIRECRAWL_API_KEY'], docsUrl: 'https://github.com/mendableai/firecrawl-mcp-server', featured: false },
  { id: 'tavily', name: 'Tavily', description: 'AI search optimized for LLMs', icon: 'scan-search', category: 'search', transportType: 'stdio', command: 'npx', args: ['-y', 'tavily-mcp'], requiredEnv: ['TAVILY_API_KEY'], docsUrl: 'https://github.com/tavily-ai/tavily-mcp', featured: true },
  { id: 'google-maps', name: 'Google Maps', description: 'Places, directions, geocoding', icon: 'map-pin', category: 'search', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-google-maps'], requiredEnv: ['GOOGLE_MAPS_API_KEY'], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps', featured: false },
  { id: 'gitlab', name: 'GitLab', description: 'Repos, MRs, pipelines (PAT)', icon: 'git-merge', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-gitlab'], requiredEnv: ['GITLAB_PERSONAL_ACCESS_TOKEN'], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab', featured: false },
  { id: 'git', name: 'Git', description: 'Local Git repos â€” log, diff, blame', icon: 'git-branch', category: 'developer', transportType: 'stdio', command: 'uvx', args: ['mcp-server-git'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git', featured: false },
  { id: 'docker', name: 'Docker', description: 'Containers, images, volumes', icon: 'ship', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', 'docker-mcp'], requiredEnv: [], docsUrl: 'https://github.com/QuantGeekDev/docker-mcp', featured: false },
  { id: 'e2b', name: 'E2B', description: 'Cloud sandbox â€” code execution', icon: 'box', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', '@e2b/mcp-server'], requiredEnv: ['E2B_API_KEY'], docsUrl: 'https://github.com/e2b-dev/mcp-server', featured: false },
  { id: 'playwright', name: 'Playwright', description: 'Browser automation (Microsoft)', icon: 'monitor', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'], requiredEnv: [], docsUrl: 'https://github.com/microsoft/playwright-mcp', featured: true },
  { id: 'puppeteer', name: 'Puppeteer', description: 'Browser automation via Puppeteer', icon: 'mouse-pointer-2', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer', featured: false },
  { id: 'aws', name: 'AWS', description: 'S3, Lambda, EC2, DynamoDB', icon: 'cloud', category: 'cloud', transportType: 'stdio', command: 'npx', args: ['-y', '@awslabs/mcp'], requiredEnv: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'], docsUrl: 'https://github.com/awslabs/mcp', featured: false },
  { id: 'kubernetes', name: 'Kubernetes', description: 'Pods, deployments, services', icon: 'network', category: 'cloud', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-k8s'], requiredEnv: ['KUBECONFIG'], docsUrl: 'https://github.com/strowk/mcp-k8s-go', featured: false },
  { id: 'terraform', name: 'Terraform', description: 'IaC â€” plan, apply, manage', icon: 'blocks', category: 'cloud', transportType: 'stdio', command: 'npx', args: ['-y', '@hashicorp/terraform-mcp-server'], requiredEnv: [], docsUrl: 'https://github.com/hashicorp/terraform-mcp-server', featured: false },
  { id: 'datadog', name: 'Datadog', description: 'Metrics, traces, logs, alerts', icon: 'activity', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', '@datadog/datadog-mcp-server'], requiredEnv: ['DD_API_KEY', 'DD_APP_KEY'], docsUrl: 'https://github.com/DataDog/datadog-mcp-server', featured: false },
  { id: 'grafana', name: 'Grafana', description: 'Dashboards, data sources, alerts', icon: 'line-chart', category: 'developer', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-grafana'], requiredEnv: ['GRAFANA_URL', 'GRAFANA_API_KEY'], docsUrl: 'https://github.com/grafana/mcp-grafana', featured: false },
  { id: 'slack-local', name: 'Slack (bot token)', description: 'Messages, canaux via bot token. Pour OAuth utilisateur â†’ Zapier.', icon: 'message-square', category: 'communication', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'], requiredEnv: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', featured: false },
  { id: 'discord', name: 'Discord', description: 'Guilds, channels, messages (bot)', icon: 'gamepad-2', category: 'communication', transportType: 'stdio', command: 'npx', args: ['-y', 'discord-mcp'], requiredEnv: ['DISCORD_BOT_TOKEN'], docsUrl: 'https://github.com/v-3/discordmcp', featured: false },
  { id: 'email-smtp', name: 'Email (SMTP)', description: 'Envoi emails via SMTP', icon: 'send', category: 'communication', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-server-email'], requiredEnv: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'], docsUrl: 'https://github.com/nicholasrq/mcp-server-email', featured: false },
  { id: 'mem0', name: 'Memory (Mem0)', description: 'MÃ©moire long terme', icon: 'brain', category: 'knowledge', transportType: 'stdio', command: 'npx', args: ['-y', 'mem0-mcp'], requiredEnv: ['MEM0_API_KEY'], docsUrl: 'https://github.com/mem0ai/mem0', featured: false },
  { id: 'context7', name: 'Context7', description: 'Docs bibliothÃ¨ques Ã  jour', icon: 'book-open', category: 'knowledge', transportType: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'], requiredEnv: [], docsUrl: 'https://github.com/upstash/context7', featured: true },
  { id: 'arxiv', name: 'ArXiv', description: 'Papiers acadÃ©miques', icon: 'file-search', category: 'knowledge', transportType: 'stdio', command: 'uvx', args: ['arxiv-mcp-server'], requiredEnv: [], docsUrl: 'https://github.com/blazickjp/arxiv-mcp-server', featured: false },
  { id: 'obsidian', name: 'Obsidian', description: 'Notes vault Obsidian', icon: 'gem', category: 'knowledge', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-obsidian'], requiredEnv: ['OBSIDIAN_VAULT_PATH'], docsUrl: 'https://github.com/smithery-ai/mcp-obsidian', featured: false },
  { id: 'filesystem', name: 'Filesystem', description: 'Fichiers locaux', icon: 'folder', category: 'system', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', featured: true },
  { id: 'time', name: 'Time', description: 'Heure + timezone', icon: 'clock', category: 'utilities', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-time'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time', featured: false },
  { id: 'replicate', name: 'Replicate', description: 'Run AI models', icon: 'cpu', category: 'ai', transportType: 'stdio', command: 'npx', args: ['-y', 'mcp-replicate'], requiredEnv: ['REPLICATE_API_TOKEN'], docsUrl: 'https://github.com/deepfates/mcp-replicate', featured: false },
  { id: 'everart', name: 'EverArt', description: 'AI image generation', icon: 'palette', category: 'ai', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-everart'], requiredEnv: ['EVERART_API_KEY'], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everart', featured: false },
  { id: 'figma', name: 'Figma', description: 'Design data (token Figma perso)', icon: 'pen-tool', category: 'design', transportType: 'stdio', command: 'npx', args: ['-y', 'figma-mcp'], requiredEnv: ['FIGMA_ACCESS_TOKEN'], docsUrl: 'https://github.com/nicholasrq/figma-mcp', featured: false },
  { id: 'sequential-thinking', name: 'Sequential Thinking', description: 'Raisonnement step-by-step', icon: 'lightbulb', category: 'reasoning', transportType: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'], requiredEnv: [], docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking', featured: true },
];

export const MCP_CATEGORIES: RegistryCategory[] = [
  { id: 'featured', name: 'RecommandÃ©s', icon: 'star', description: 'IntÃ©grations populaires' },
  { id: 'developer', name: 'DÃ©veloppeur', icon: 'code', description: 'Code, CI/CD, monitoring' },
  { id: 'productivity', name: 'ProductivitÃ©', icon: 'clipboard-list', description: 'Projets, notes, tÃ¢ches' },
  { id: 'search', name: 'Recherche & Web', icon: 'search', description: 'Recherche, scraping, browsing' },
  { id: 'database', name: 'Bases de donnÃ©es', icon: 'database', description: 'SQL, NoSQL, vectoriel' },
  { id: 'communication', name: 'Communication', icon: 'message-square', description: 'Chat, email' },
  { id: 'cloud', name: 'Cloud & DevOps', icon: 'cloud', description: 'AWS, Cloudflare, Vercel' },
  { id: 'knowledge', name: 'Connaissance', icon: 'book-open', description: 'MÃ©moire, recherche' },
  { id: 'finance', name: 'Finance', icon: 'credit-card', description: 'Paiements, compta' },
  { id: 'ecommerce', name: 'E-Commerce', icon: 'shopping-bag', description: 'Boutiques, commandes' },
  { id: 'support', name: 'Support Client', icon: 'headphones', description: 'Tickets, chat live' },
  { id: 'ai', name: 'IA & ModÃ¨les', icon: 'cpu', description: 'Model hubs' },
  { id: 'design', name: 'Design', icon: 'pen-tool', description: 'Figma, assets' },
  { id: 'system', name: 'SystÃ¨me', icon: 'terminal', description: 'Fichiers, OS, shell' },
  { id: 'reasoning', name: 'Raisonnement', icon: 'brain', description: 'RÃ©flexion, planification' },
  { id: 'utilities', name: 'Utilitaires', icon: 'wrench', description: 'Temps, automation' },
];