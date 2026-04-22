import { useState } from 'react';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';

/**
 * Detects live-browser session URLs in tool output.
 * Supported:
 *  - Browserbase debugger live view:     https://www.browserbase.com/devtools-internal-compiled/index.html?...
 *  - Browserbase session live URL:       https://www.browserbase.com/sessions/{id}
 *  - Explicit keys in JSON output:       "liveViewUrl", "sessionUrl", "debuggerFullscreenUrl"
 *  - Playwright MCP trace URL:           https://trace.playwright.dev/?trace=...
 */
const LIVE_VIEW_PATTERNS = [
  /https?:\/\/(?:www\.)?browserbase\.com\/(?:devtools-internal-compiled|sessions)[^\s"')}]+/gi,
  /https?:\/\/trace\.playwright\.dev\/\?trace=[^\s"')}]+/gi,
];

const JSON_KEY_PATTERNS = [
  /"(?:liveViewUrl|sessionUrl|debuggerFullscreenUrl|debugUrl)"\s*:\s*"([^"]+)"/gi,
];

export function detectLiveBrowserUrl(text: string): string | null {
  if (!text) return null;
  for (const pattern of JSON_KEY_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m && m[1]) return m[1];
  }
  for (const pattern of LIVE_VIEW_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m && m[0]) return m[0];
  }
  return null;
}

interface Props {
  url: string;
}

export default function LiveBrowserView({ url }: Props) {
  const [visible, setVisible] = useState(true);
  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-border-medium bg-surface-secondary">
      <div className="flex items-center justify-between gap-2 border-b border-border-light bg-surface-tertiary px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-text-primary">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Live browser session
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
            aria-label={visible ? 'Hide' : 'Show'}
          >
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {visible ? 'Hide' : 'Show'}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </div>
      </div>
      {visible && (
        <iframe
          src={url}
          title="Live browser session"
          className="h-[480px] w-full border-0 bg-black"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
