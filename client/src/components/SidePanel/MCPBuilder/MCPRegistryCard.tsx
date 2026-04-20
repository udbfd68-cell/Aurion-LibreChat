import { useState } from 'react';
import type { TMCPRegistryServer } from 'librechat-data-provider';
import { ExternalLink, ChevronDown, ChevronUp, Star, Key } from 'lucide-react';

type MCPRegistryCardProps = {
  server: TMCPRegistryServer;
};

export default function MCPRegistryCard({ server }: MCPRegistryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasEnvVars = server.requiredEnv && server.requiredEnv.length > 0;

  return (
    <div
      className={`group rounded-lg border transition-all ${
        server.featured
          ? 'border-green-500/30 bg-green-50/5'
          : 'border-border-light'
      } hover:border-green-500/50 hover:bg-surface-secondary`}
    >
      <button
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-base">
          {server.icon || '🔌'}
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-medium text-text-primary">{server.name}</h4>
            {server.featured && (
              <Star className="h-3 w-3 flex-shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
            {server.description}
          </p>
        </div>

        {/* Expand toggle */}
        <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5">
          <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-tertiary">
            {server.category}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border-light px-3 pb-3 pt-2">
          {/* Command */}
          <div className="mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Command
            </span>
            <code className="mt-0.5 block rounded bg-surface-tertiary px-2 py-1 text-[11px] text-text-secondary">
              {server.command} {server.args?.join(' ')}
            </code>
          </div>

          {/* Required env vars */}
          {hasEnvVars && (
            <div className="mb-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                <Key className="h-2.5 w-2.5" />
                Required Keys
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {server.requiredEnv?.map((env) => (
                  <span
                    key={env}
                    className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400"
                  >
                    {env}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {server.docsUrl && (
              <a
                href={server.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-green-700"
              >
                <ExternalLink className="h-3 w-3" />
                View on GitHub
              </a>
            )}
            {server.transportType && (
              <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-tertiary">
                {server.transportType}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
