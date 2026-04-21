import { useMemo, memo } from 'react';
import { Plug2, ChevronDown, Check, Settings } from 'lucide-react';
import * as Ariakit from '@ariakit/react';
import { TooltipAnchor } from '@librechat/client';
import { MCP_SERVERS } from './registryData';
import { getIcon } from './iconMap';
import { useConnectorStore } from './useConnectorStore';
import { useMCPConnectors } from './useMCPConnectors';
import { cn } from '~/utils';

/**
 * Connector toggle dropdown for the chat input area.
 * Shows connected integrations and lets user toggle them per conversation.
 */
function ConnectorToggle() {
  const localStore = useConnectorStore();
  const mcpStore = useMCPConnectors();

  // Use real MCP API data when backend is available, fall back to localStorage
  const connectedIds = mcpStore.isBackendAvailable ? mcpStore.connectedIds : localStore.connectedIds;
  const connectedCount = mcpStore.isBackendAvailable ? mcpStore.connectedCount : localStore.connectedCount;

  const menuStore = Ariakit.useMenuStore({ focusLoop: true });
  const isOpen = menuStore.useState('open');

  const connectedServers = useMemo(
    () => MCP_SERVERS.filter((s) => connectedIds.includes(s.id)),
    [connectedIds],
  );

  return (
    <Ariakit.MenuProvider store={menuStore}>
      <TooltipAnchor
        description="Integrations"
        disabled={isOpen}
        render={
          <Ariakit.MenuButton
            className={cn(
              'group relative inline-flex items-center justify-center gap-1.5',
              'border border-border-medium text-sm font-medium transition-all',
              'h-9 min-w-9 rounded-full bg-transparent px-2.5 shadow-sm',
              'hover:bg-surface-hover hover:shadow-md active:shadow-inner',
              connectedCount > 0 && 'border-border-heavy',
              isOpen && 'bg-surface-hover',
            )}
          />
        }
      >
        <Plug2 className="h-4 w-4" />
        {connectedCount > 0 && (
          <span className="text-xs font-semibold text-text-primary">{connectedCount}</span>
        )}
        <ChevronDown className="h-3 w-3 text-text-tertiary" />
      </TooltipAnchor>

      <Ariakit.Menu
        gutter={8}
        className="z-[1000] max-h-96 w-72 overflow-y-auto rounded-xl border border-border-light bg-surface-primary p-2 shadow-xl"
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-text-primary">Active Integrations</span>
          <a
            href="/connectors"
            className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary hover:underline"
          >
            <Settings className="h-3 w-3" />
            Manage
          </a>
        </div>

        {connectedServers.length > 0 ? (
          <>
            {connectedServers.map((server) => {
              const Icon = getIcon(server.icon);
              return (
                <Ariakit.MenuItem
                  key={server.id}
                  className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-surface-tertiary">
                    <Icon className="h-3.5 w-3.5 text-text-secondary" />
                  </div>
                  <span className="flex-1 text-xs font-medium text-text-primary">
                    {server.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <Check className="h-3.5 w-3.5 text-text-tertiary" />
                  </div>
                </Ariakit.MenuItem>
              );
            })}
          </>
        ) : (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-text-tertiary">No integrations connected</p>
            <a
              href="/connectors"
              className="mt-1 inline-block text-xs text-text-secondary hover:underline"
            >
              Connect your first integration →
            </a>
          </div>
        )}
      </Ariakit.Menu>
    </Ariakit.MenuProvider>
  );
}

export default memo(ConnectorToggle);
