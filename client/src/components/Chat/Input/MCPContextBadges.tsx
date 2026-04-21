/**
 * MCPContextBadges — The claude.ai-style "via Gmail / via Drive" indicator.
 *
 * Renders absolutely nothing when the routing engine returns an empty list.
 * When services are detected, renders a tiny, low-contrast row of pills
 * under the composer. Zero user interaction, purely informational.
 */
import { memo } from 'react';
import type { RouterMatch } from '~/hooks/useMCPRouter';

const ICON_MAP: Record<string, string> = {
  mail: '✉',
  'hard-drive': '📁',
  calendar: '📅',
  github: '',
  kanban: '📋',
  'message-square': '💬',
  folder: '📂',
  search: '🔍',
  book: '📘',
};

interface Props {
  matches: RouterMatch[];
}

function MCPContextBadges({ matches }: Props) {
  if (!matches || matches.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="mcp-context-badges"
      className="flex items-center gap-1.5 px-3 py-1 text-xs text-text-tertiary opacity-80 transition-opacity duration-200"
    >
      <span className="shrink-0">via</span>
      {matches.map((m) => (
        <span
          key={m.id}
          data-testid={`mcp-badge-${m.id}`}
          className="flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
        >
          <span className="text-[10px]" aria-hidden="true">
            {ICON_MAP[m.icon] ?? '⚡'}
          </span>
          {m.label}
        </span>
      ))}
    </div>
  );
}

export default memo(MCPContextBadges);
