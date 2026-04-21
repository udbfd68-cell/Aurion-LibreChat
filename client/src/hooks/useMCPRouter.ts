/**
 * useMCPRouter — Debounced hook that calls the server-side contextual
 * routing endpoint while the user is typing. Falls back to client-side
 * rules (useIntentDetection) when offline / API unavailable.
 *
 * Returns the list of MCP services detected for the current input text.
 * The UI renders these as tiny "via Gmail / via Drive" badges only when
 * the list is non-empty — exactly mirroring claude.ai's silent behavior.
 */
import { useEffect, useRef, useState } from 'react';
import { detectIntents, type DetectedIntent } from './Chat/useIntentDetection';

export interface RouterMatch {
  id: string;
  label: string;
  icon: string;
  priority?: number;
  score?: number;
  matched?: string[];
}

const DEBOUNCE_MS = 400;
const MIN_LEN = 3;

export function useMCPRouter(text: string): RouterMatch[] {
  const [matches, setMatches] = useState<RouterMatch[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = text?.trim() ?? '';
    if (trimmed.length < MIN_LEN) {
      setMatches([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Abort the previous in-flight request.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch('/api/mcp/route/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
          signal: ctrl.signal,
          credentials: 'include',
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (Array.isArray(data?.matches)) {
          setMatches(data.matches as RouterMatch[]);
          return;
        }
      } catch (_e) {
        // Fallback: client-side heuristic so badges still work offline.
        const fallback: DetectedIntent[] = detectIntents(trimmed);
        setMatches(fallback.map((m) => ({ id: m.id, label: m.label, icon: m.icon })));
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  return matches;
}

export default useMCPRouter;
