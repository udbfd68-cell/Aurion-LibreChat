/**
 * MCP Routing Rules — Declarative keyword-based rules for contextual
 * MCP server activation. Each rule maps a set of bilingual (FR/EN) keywords
 * to a target MCP server id, a display label, an icon hint, and a priority.
 *
 * Edit this file freely to add/remove services; the engine auto-picks up changes.
 * Matching is case-insensitive, accent-insensitive, and substring-based.
 */

/**
 * @typedef {Object} RoutingRule
 * @property {string} id           - Unique MCP server id (matches librechat.yaml)
 * @property {string} label        - Short display label ("Gmail", "Drive", ...)
 * @property {string} icon         - Lucide-react icon name hint
 * @property {number} priority     - Higher = wins on conflicts (default 10)
 * @property {string[]} keywords   - Bilingual keywords / phrases
 * @property {RegExp[]} [patterns] - Optional regex patterns (post-normalization)
 */

/** @type {RoutingRule[]} */
const MCP_ROUTING_RULES = [
  {
    id: 'gmail',
    label: 'Gmail',
    icon: 'mail',
    priority: 20,
    keywords: [
      // EN
      'email', 'e-mail', 'mail', 'gmail', 'inbox', 'draft', 'reply', 'forward',
      'attachment', 'send message to', 'write to ', 'compose',
      // FR
      'courriel', 'envoie un mail', 'envoyer un mail', 'envoie un email',
      'envoyer un email', 'boite de reception', 'piece jointe', 'repondre a',
      'transferer', 'redige un mail', 'redige un email',
    ],
  },
  {
    id: 'google-drive',
    label: 'Drive',
    icon: 'hard-drive',
    priority: 15,
    keywords: [
      // EN
      'drive', 'google drive', 'gdrive', 'google doc', 'google docs',
      'google sheet', 'google sheets', 'spreadsheet', 'shared drive',
      'upload', 'download', 'share the file', 'share file',
      // FR
      'fichier', 'document', 'dossier', 'feuille de calcul', 'tableur',
      'partage le fichier', 'partage le document', 'telecharge', 'televerse',
    ],
  },
  {
    id: 'google-calendar',
    label: 'Calendar',
    icon: 'calendar',
    priority: 18,
    keywords: [
      // EN
      'calendar', 'meeting', 'event', 'schedule', 'appointment', 'agenda',
      'availability', 'book a slot', 'next week', 'tomorrow at',
      // FR
      'reunion', 'rendez-vous', 'rdv', 'calendrier', 'planning', 'disponibilite',
      'demain matin', 'demain a', 'lundi', 'mardi', 'mercredi', 'jeudi',
      'vendredi', 'samedi', 'dimanche', 'semaine prochaine', 'bloquer un creneau',
    ],
  },
  {
    id: 'linear',
    label: 'Linear',
    icon: 'kanban',
    priority: 16,
    keywords: [
      // EN
      'linear', 'ticket', 'sprint', 'backlog', 'roadmap', 'story', 'epic',
      'triage', 'milestone', 'feature request', 'bug report', 'assign to',
      // FR
      'tache de dev', 'ticket de bug', 'priorite dans', 'fiche linear',
      'suivi de projet', 'suivi de sprint',
    ],
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    priority: 17,
    keywords: [
      // EN
      'github', 'repo', 'repository', 'pull request', 'pr ', 'commit',
      'branch', 'merge', 'fork', 'clone', 'git push', 'git pull', 'gh cli',
      'code review',
      // FR
      'depot git', 'revue de code', 'fusionner la branche',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    icon: 'message-square',
    priority: 14,
    keywords: [
      // EN
      'slack', 'channel', 'direct message', 'dm ', 'workspace',
      'post in #', 'slack channel',
      // FR
      'envoie sur slack', 'poste dans le channel', 'canal slack',
    ],
  },
  {
    id: 'notion',
    label: 'Notion',
    icon: 'book',
    priority: 12,
    keywords: [
      'notion', 'notion page', 'notion doc', 'database in notion',
      'page notion', 'base notion',
    ],
  },
  {
    id: 'brave-search',
    label: 'Search',
    icon: 'search',
    priority: 10,
    keywords: [
      // EN
      'search the web', 'look up', 'latest news', 'current price',
      'what happened', 'who won', 'recent', 'today news',
      'latest version of', 'news about',
      // FR
      'cherche sur internet', 'cherche sur le web', 'recherche sur le web',
      'actualite', 'actualites', 'prix actuel', 'derniere version de',
      'quoi de neuf sur', 'que s est il passe',
    ],
  },
  {
    id: 'filesystem',
    label: 'Files',
    icon: 'folder',
    priority: 8,
    keywords: [
      'local file', 'workspace file', 'read file ', 'write file ',
      'fichier local', 'fichier du workspace', 'lire le fichier',
      'ecrire le fichier', 'chemin absolu',
    ],
  },
];

/**
 * Normalize text: lowercase + strip diacritics + collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  MCP_ROUTING_RULES,
  normalize,
};
