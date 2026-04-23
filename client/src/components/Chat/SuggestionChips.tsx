/**
 * SuggestionChips — claude.ai-style starter prompts shown on the empty landing
 * page. Clicking a chip fills the chat textarea (without sending) so the user
 * can tweak before pressing Enter.
 *
 * Uses the React-compatible "native setter + input event" trick so that
 * react-hook-form's internal state stays in sync.
 */
import { useMemo } from 'react';
import { Pencil, Code2, GraduationCap, Sparkles, Briefcase, Lightbulb } from 'lucide-react';
import { mainTextareaId } from '~/common/types';

interface Chip {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}

const CHIPS: Chip[] = [
  {
    icon: Pencil,
    label: 'Rédiger',
    prompt: 'Aide-moi à rédiger ',
  },
  {
    icon: Code2,
    label: 'Coder',
    prompt: 'Écris du code qui ',
  },
  {
    icon: GraduationCap,
    label: 'Apprendre',
    prompt: 'Explique-moi simplement ',
  },
  {
    icon: Lightbulb,
    label: 'Brainstormer',
    prompt: 'Donne-moi des idées pour ',
  },
  {
    icon: Briefcase,
    label: 'Travail',
    prompt: 'Rédige un email professionnel pour ',
  },
  {
    icon: Sparkles,
    label: 'Analyser',
    prompt: 'Analyse ce texte et dis-moi ',
  },
];

function fillTextarea(text: string): void {
  const el = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
  if (!el) {
    return;
  }
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  if (setter) {
    setter.call(el, text);
  } else {
    el.value = text;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  // Move caret to the end so the user can continue typing.
  el.focus();
  try {
    el.setSelectionRange(text.length, text.length);
  } catch {
    /* ignore */
  }
}

export default function SuggestionChips() {
  const chips = useMemo(() => CHIPS, []);

  return (
    <div
      className="animate-fadeIn mt-8 flex flex-wrap items-center justify-center gap-2 px-4"
      role="group"
      aria-label="Suggestions de départ"
    >
      {chips.map(({ icon: Icon, label, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => fillTextarea(prompt)}
          className="flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-medium hover:bg-surface-hover hover:text-text-primary"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
