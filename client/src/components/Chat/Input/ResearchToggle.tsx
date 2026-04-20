import React, { memo, useState, useCallback } from 'react';
import { BookOpenCheck } from 'lucide-react';
import { CheckboxButton, Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';

/**
 * Research mode toggle — Claude.ai style.
 * Adds a "Research" badge to the chat input that activates deep research mode.
 * When active, the model performs multi-step agentic research with sub-questions,
 * web search, and synthesized report generation.
 */
function ResearchToggle() {
  const localize = useLocalize();
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleToggle = useCallback(
    (value: boolean) => {
      if (isRunning) {
        return;
      }
      setIsResearchMode(value);
    },
    [isRunning],
  );

  return (
    <CheckboxButton
      className="max-w-fit"
      checked={isResearchMode}
      setValue={handleToggle}
      label={localize('com_ui_deep_research') || 'Research'}
      isCheckedClassName="border-indigo-600/40 bg-indigo-500/10 hover:bg-indigo-700/10"
      icon={
        isRunning ? (
          <Spinner className="icon-md" />
        ) : (
          <BookOpenCheck className="icon-md" aria-hidden="true" />
        )
      }
    />
  );
}

export default memo(ResearchToggle);
