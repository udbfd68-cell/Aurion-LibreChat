/**
 * useIntentDetection — Analyzes typed text in real-time and detects which
 * MCP services are relevant. Returns a list of detected service IDs with
 * display labels and icons.
 *
 * No user interaction required — this is a silent, automatic system.
 */
import { useMemo } from 'react';

export interface DetectedIntent {
  id: string;
  label: string;
  icon: string;
}

interface IntentRule {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

const INTENT_RULES: IntentRule[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    icon: 'mail',
    keywords: [
      'email', 'mail', 'gmail', 'send message', 'inbox', 'draft', 'reply', 'forward',
      'courriel', 'envoie un mail', 'envoie un email', 'envoyer', 'message à',
    ],
  },
  {
    id: 'google-drive',
    label: 'Drive',
    icon: 'hard-drive',
    keywords: [
      'drive', 'google drive', 'document', 'spreadsheet', 'google doc', 'google sheet',
      'fichier', 'dossier', 'folder', 'shared drive', 'gdrive',
    ],
  },
  {
    id: 'google-calendar',
    label: 'Calendar',
    icon: 'calendar',
    keywords: [
      'calendar', 'meeting', 'event', 'schedule', 'appointment', 'agenda',
      'réunion', 'rendez-vous', 'calendrier', 'planning', 'demain', 'lundi', 'mardi',
      'mercredi', 'jeudi', 'vendredi', 'next week', 'semaine prochaine',
    ],
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    keywords: [
      'github', 'repo', 'repository', 'pull request', 'pr', 'issue', 'commit',
      'branch', 'merge', 'code review', 'git push', 'git pull',
    ],
  },
  {
    id: 'linear',
    label: 'Linear',
    icon: 'kanban',
    keywords: [
      'linear', 'ticket', 'sprint', 'backlog', 'roadmap', 'task', 'project',
      'story', 'epic', 'triage', 'priority', 'assign', 'issue tracker',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    icon: 'message-square',
    keywords: [
      'slack', 'channel', 'dm', 'direct message', 'workspace', 'notification',
      'envoie sur slack', 'poste dans', '#',
    ],
  },
  {
    id: 'filesystem',
    label: 'Files',
    icon: 'folder',
    keywords: [
      'file', 'directory', 'folder', 'read file', 'write file', 'create file',
      'fichier local', 'répertoire', 'chemin', 'path',
    ],
  },
  {
    id: 'brave-search',
    label: 'Search',
    icon: 'search',
    keywords: [
      'search', 'find', 'look up', 'google', 'latest', 'current', 'today', 'news',
      'cherche', 'recherche', 'actualité', 'quand', 'prix', 'weather', 'météo',
    ],
  },
];

/**
 * Given text, returns the list of detected intents.
 * Uses simple keyword matching with debounce handled by the caller.
 */
export function detectIntents(text: string): DetectedIntent[] {
  if (!text || text.trim().length < 3) return [];
  const lower = text.toLowerCase();

  const detected: DetectedIntent[] = [];
  const seen = new Set<string>();

  for (const rule of INTENT_RULES) {
    if (seen.has(rule.id)) continue;
    const matched = rule.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      detected.push({ id: rule.id, label: rule.label, icon: rule.icon });
      seen.add(rule.id);
    }
  }

  return detected;
}

/**
 * Hook that wraps detectIntents in a useMemo for performance.
 * Pass in the current textarea value.
 */
export function useIntentDetection(text: string): DetectedIntent[] {
  return useMemo(() => detectIntents(text), [text]);
}

export default useIntentDetection;
