import { memo, useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '~/utils';

interface MemoryNotificationPillProps {
  /** The memory key that was extracted/updated */
  memoryKey: string;
  /** Brief summary of what was remembered */
  summary: string;
  /** Whether this is a new memory vs an update */
  isNew?: boolean;
  /** Callback when user dismisses */
  onDismiss?: () => void;
}

/**
 * Claude.ai-style in-chat memory notification pill.
 * Appears inline in the message stream when memory is extracted or updated
 * during a conversation. Shows a brief summary with expand/collapse.
 */
function MemoryNotificationPill({
  memoryKey,
  summary,
  isNew = true,
  onDismiss,
}: MemoryNotificationPillProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'my-2 flex items-start gap-2 transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
      )}
    >
      <div
        className={cn(
          'inline-flex max-w-md cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all',
          isNew
            ? 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10'
            : 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10',
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Brain
          className={cn('h-3.5 w-3.5 flex-shrink-0', isNew ? 'text-purple-500' : 'text-blue-500')}
        />
        <span className="font-medium text-text-secondary">
          {isNew ? 'Memory saved' : 'Memory updated'}
        </span>
        <span className="truncate text-text-tertiary">{memoryKey}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 flex-shrink-0 text-text-tertiary" />
        ) : (
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-text-tertiary" />
        )}
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="ml-1 flex-shrink-0 rounded-full p-0.5 hover:bg-surface-tertiary"
          >
            <X className="h-3 w-3 text-text-tertiary" />
          </button>
        )}
      </div>
      {isExpanded && (
        <div
          className={cn(
            'mt-1 max-w-md rounded-lg border px-3 py-2 text-xs text-text-secondary',
            isNew ? 'border-purple-500/10 bg-purple-500/5' : 'border-blue-500/10 bg-blue-500/5',
          )}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

export default memo(MemoryNotificationPill);
