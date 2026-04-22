/**
 * MCP Contextual Routing Rules
 *
 * Each rule declares one MCP server and the keywords (bilingual FR/EN,
 * case-insensitive, accent-insensitive, substring match) that should
 * activate it when found in the user message.
 *
 * Priority affects ordering in the returned server list only.
 *
 * Edit this file to add new connectors. No code changes needed in the engine.
 */

/** @typedef {{ serverName: string, keywords: string[], priority: number }} RoutingRule */

/** @type {RoutingRule[]} */
const ROUTING_RULES = [
  {
    serverName: 'gmail',
    priority: 10,
    keywords: [
      // FR
      'email', 'e-mail', 'mail', 'mails', 'courriel',
      'envoyer un email', 'envoyer un mail', 'envoyer un courriel',
      'repondre au mail', 'repondre a', 'transferer',
      'boite mail', 'boite de reception', 'inbox',
      'piece jointe', 'objet du mail', 'objet de l email',
      'destinataire', 'expediteur',
      // EN
      'send email', 'send mail', 'reply to', 'reply email',
      'forward', 'attachment', 'subject line', 'compose email',
      'read email', 'unread mail', 'check mail',
    ],
  },
  {
    serverName: 'google-drive',
    priority: 10,
    keywords: [
      // FR
      'drive', 'google drive', 'mon drive',
      'fichier', 'document', 'dossier',
      'partager un fichier', 'partage', 'televerser', 'uploader',
      'telecharger', 'google doc', 'google docs', 'google sheet',
      'feuille de calcul', 'tableur', 'sheet', 'spreadsheet',
      'acceder au fichier', 'trouver le document',
      // EN
      'file', 'folder', 'share file', 'upload file', 'download file',
      'google doc', 'google sheet', 'google slide', 'spreadsheet',
      'find document', 'access file',
    ],
  },
  {
    serverName: 'google-calendar',
    priority: 10,
    keywords: [
      // FR
      'calendrier', 'agenda', 'planning',
      'reunion', 'rendez-vous', 'rdv', 'meeting',
      'evenement', 'creer un evenement',
      'disponibilite', 'disponible',
      'demain matin', 'demain apres-midi', 'demain soir',
      'semaine prochaine', 'ce soir', 'ce matin', 'cet apres-midi',
      'a quelle heure', 'heure de', 'bloquer un creneau', 'creneau',
      // EN
      'calendar', 'schedule', 'appointment',
      'create event', 'event', 'book a meeting', 'book meeting',
      'available', 'availability', 'free slot',
      'tomorrow morning', 'next week', 'this evening',
      'what time', 'block time',
    ],
  },
  {
    serverName: 'linear',
    priority: 9,
    keywords: [
      // FR
      'linear', 'ticket', 'issue linear',
      'bug', 'sprint', 'backlog',
      'tache de developpement', 'feature request', 'fonctionnalite',
      'milestone', 'priorite', 'assigne a', 'assigne a moi',
      'creer un ticket', 'ouvrir un bug', 'ouvrir un ticket',
      // EN
      'create issue', 'open issue', 'linear issue',
      'task', 'assign', 'assigned to',
      'create ticket', 'open ticket', 'priority',
      'sprint planning', 'product backlog',
    ],
  },
  {
    serverName: 'github',
    priority: 9,
    keywords: [
      // FR
      'github', 'repo', 'repository', 'depot',
      'pull request', 'pr ', 'merge request',
      'commit', 'branche', 'merge', 'fork', 'cloner le repo',
      'issues github', 'code review', 'revue de code',
      'releases github', 'workflow github',
      // EN
      'pull request', 'repo', 'repository',
      'commit', 'branch', 'merge', 'fork', 'clone repo',
      'code review', 'github issue', 'github action',
    ],
  },
  {
    serverName: 'slack',
    priority: 7,
    keywords: [
      // FR
      'slack', 'channel slack', 'canal slack',
      'message slack', 'dm slack', 'poster sur slack',
      // EN
      'slack channel', 'slack dm', 'slack message', 'post to slack',
    ],
  },
  {
    serverName: 'notion',
    priority: 7,
    keywords: [
      // FR
      'notion', 'page notion', 'base de donnees notion',
      'wiki', 'documentation', 'notes',
      // EN
      'notion page', 'notion db', 'notion database', 'notion workspace',
    ],
  },
  {
    serverName: 'brave-search',
    priority: 6,
    keywords: [
      // FR
      'rechercher sur le web', 'recherche web', 'chercher sur internet',
      'actualite', 'actualites', 'prix actuel', 'derniere version',
      "qu'est-ce qui se passe avec", 'quoi de neuf',
      'trouver des informations sur', 'info recente',
      // EN
      'search the web', 'web search', 'latest news', 'current price',
      'what happened', 'find information about', 'look up online',
      'recent information', 'up to date',
    ],
  },
  {
    serverName: 'tavily',
    priority: 6,
    keywords: [
      'deep research', 'recherche approfondie', 'recherche exhaustive',
      'tavily',
    ],
  },
  {
    serverName: 'exa',
    priority: 5,
    keywords: [
      'recherche semantique', 'semantic search', 'exa search',
      'similar papers', 'academic search',
    ],
  },
  {
    serverName: 'firecrawl',
    priority: 5,
    keywords: [
      'scrape', 'scraper', 'extraire le contenu', 'crawl',
      'firecrawl', 'extract from url', 'parse website',
    ],
  },
  {
    serverName: 'perplexity',
    priority: 5,
    keywords: [
      'perplexity', 'ask perplexity',
    ],
  },
  {
    serverName: 'filesystem',
    priority: 5,
    keywords: [
      // FR
      'fichier local', 'workspace', 'repertoire local',
      'lire le fichier dans le projet', 'ecrire dans le fichier',
      'acceder au dossier local',
      // EN
      'local file', 'read from workspace', 'write to workspace',
      'project file',
    ],
  },
  {
    serverName: 'stripe',
    priority: 5,
    keywords: [
      'stripe', 'paiement stripe', 'facture stripe',
      'stripe invoice', 'stripe customer',
    ],
  },
  {
    serverName: 'hubspot',
    priority: 5,
    keywords: [
      'hubspot', 'crm', 'contact hubspot',
      'deal hubspot', 'pipeline de vente', 'sales pipeline',
    ],
  },
  {
    serverName: 'airtable',
    priority: 4,
    keywords: [
      'airtable', 'base airtable',
    ],
  },
  {
    serverName: 'postgres',
    priority: 4,
    keywords: [
      'postgres', 'postgresql', 'requete sql', 'sql query',
      'base de donnees postgres',
    ],
  },
  {
    serverName: 'google-maps',
    priority: 4,
    keywords: [
      'google maps', 'itineraire', 'distance entre',
      'directions', 'adresse de', 'coordonnees gps',
    ],
  },
  {
    serverName: 'stagehand',
    priority: 8,
    keywords: [
      // FR — agentic multi-step
      'navigue et extrait', 'connecte-toi puis', 'trouve-moi', 'trouve moi',
      'recherche puis clique', 'fais une recherche sur',
      'extrais les emails', 'extraire les contacts', 'liste les entreprises',
      // FR — prospection haute intention
      'prospection linkedin', 'prospecter sur linkedin',
      'trouve des prospects', 'trouve-moi des clients',
      'generer une liste de leads', 'qualifier des prospects',
      // EN
      'find me', 'log in then', 'search and click', 'extract from the site',
      'prospect on linkedin', 'qualify leads', 'enrich prospects',
      'agentic browsing', 'autonomous web',
    ],
  },
  {
    serverName: 'puppeteer',
    priority: 7,
    keywords: [
      // FR — navigation web autonome
      'navigue sur', 'va sur le site', 'va voir sur', 'ouvre le site',
      'ouvre la page', 'ouvre l url', 'visite le site', 'visite la page',
      'charge la page', 'extraire le contenu de', 'scrape', 'scraper',
      'capture d ecran', 'screenshot de la page', 'screenshot de',
      'automatiser le navigateur', 'clique sur le bouton', 'remplis le formulaire',
      'connecte-toi au site', 'connecte toi a', 'se connecter sur',
      // FR — prospection / recherche d entreprises / profils
      'prospection', 'prospect', 'prospecter', 'prospects',
      'cherche des prospects', 'trouve des clients', 'generer des leads',
      'leads', 'contact commercial', 'linkedin', 'sales navigator',
      'profil linkedin', 'entreprise sur linkedin', 'crunchbase',
      'site web de l entreprise', 'site internet de', 'page contact',
      // EN
      'browse to', 'go to the website', 'open the page', 'visit the page',
      'navigate to', 'browser automation', 'headless browser',
      'screenshot the page', 'scrape the site', 'extract content from',
      'click the button', 'fill the form', 'login to the site',
      'prospecting', 'find leads', 'find prospects', 'generate leads',
      'lookup company', 'linkedin profile', 'sales navigator',
    ],
  },
  {
    serverName: 'brave-search',
    priority: 6,
    keywords: [
      // Already covered elsewhere but add prospection variants
      'cherche sur internet', 'cherche sur google', 'recherche web',
      'trouve moi des', 'recherche des entreprises', 'recherche sur le web',
      'search the web', 'google search', 'web search', 'look up online',
      'find companies', 'find businesses',
    ],
  },
  {
    serverName: 'memory',
    priority: 2,
    keywords: [
      'rappelle-toi', 'souviens-toi', 'memorise',
      'remember this', 'take note of',
    ],
  },
  {
    serverName: 'sequential-thinking',
    priority: 2,
    keywords: [
      'reflechis etape par etape', 'raisonne pas a pas',
      'think step by step', 'reasoning steps',
    ],
  },
  {
    serverName: 'todoist',
    priority: 4,
    keywords: [
      'todoist', 'tache todoist', 'liste todoist',
      'todo list todoist',
    ],
  },
  {
    serverName: 'gitlab',
    priority: 4,
    keywords: [
      'gitlab', 'merge request gitlab', 'pipeline gitlab',
    ],
  },
];

module.exports = { ROUTING_RULES };
