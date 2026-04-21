/**
 * IntentBadges — Tiny, Claude.ai-style contextual indicator that shows
 * which services the AI will use based on the current message.
 *
 * Appears silently below the input, only when relevant services are detected.
 * No user interaction required — purely informational.
 */
import { memo } from 'react';
import type { DetectedIntent } from '~/hooks/Chat/useIntentDetection';

const ICON_MAP: Record<string, string> = {
  mail: '✉',
  'hard-drive': '📁',
  calendar: '📅',
  github: '',
  kanban: '📋',
  'message-square': '💬',
  folder: '📂',
  search: '🔍',
};

interface IntentBadgesProps {
  intents: DetectedIntent[];
}

function IntentBadges({ intents }: IntentBadgesProps) {
  if (intents.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-text-tertiary opacity-80 transition-opacity duration-200">
      <span className="shrink-0">via</span>
      {intents.map((intent) => (
        <span
          key={intent.id}
          className="flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
        >
          <span className="text-[10px]" aria-hidden="true">
            {ICON_MAP[intent.icon] ?? '⚡'}
          </span>
          {intent.label}
        </span>
      ))}
    </div>
  );
}

export default memo(IntentBadges);
