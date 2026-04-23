/**
 * useMCPConnectors — Bridge between the Connectors UI and LibreChat's real MCP API.
 *
 * Falls back to localStorage when the backend returns 403 (MCP permissions not enabled).
 * - Creates MCP server configs via POST /api/mcp/servers
 * - Deletes MCP server configs via DELETE /api/mcp/servers/:name
 * - Reinitializes servers via POST /api/mcp/:name/reinitialize
 * - Fetches real connection status via GET /api/mcp/connection/status
 * - Fetches real tools via GET /api/mcp/tools
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useMCPServersQuery,
  useMCPToolsQuery,
  useCreateMCPServerMutation,
  useDeleteMCPServerMutation,
} from '~/data-provider/MCP';
import { useMCPConnectionStatusQuery } from '~/data-provider/Tools/queries';
import { dataService } from 'librechat-data-provider';
import type { RegistryServer } from './registryData';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPConnectorInfo {
  serverName: string;
  state: ConnectionState;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
  error?: string;
}

/* ── localStorage fallback store ── */
const LS_KEY = 'librechat_mcp_connections';

function lsRead(): Record<string, { connectedAt: string; url: string }> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}
function lsWrite(data: Record<string, { connectedAt: string; url: string }>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/**
 * Build the MCP server config payload from a registry entry.
 * Only remote transports (SSE, Streamable HTTP) are allowed via the API.
 */
function buildServerConfig(server: RegistryServer) {
  if (!server.remoteUrl) {
    return null;
  }

  const transport = server.transportType === 'sse' ? 'sse' : 'streamable-http';

  const config: Record<string, unknown> = {
    type: transport,
    url: server.remoteUrl,
    title: server.name,
    description: server.description,
    iconPath: server.icon,
  };

  // Add OAuth config if the server requires it
  if (server.oauth) {
    config.oauth = {};
    if (server.oauth.authUrl) {
      (config.oauth as Record<string, string>).authorization_url = server.oauth.authUrl;
    }
    if (server.oauth.tokenUrl) {
      (config.oauth as Record<string, string>).token_url = server.oauth.tokenUrl;
    }
    if (server.oauth.scopes) {
      (config.oauth as Record<string, string>).scope = server.oauth.scopes.join(' ');
    }
  }

  return config;
}

export function useMCPConnectors() {
  // Real API queries
  const serversQuery = useMCPServersQuery({ retry: 1 });
  const toolsQuery = useMCPToolsQuery({ retry: 1 });
  const statusQuery = useMCPConnectionStatusQuery({ retry: 1 });
  const createMutation = useCreateMCPServerMutation();
  const deleteMutation = useDeleteMCPServerMutation();

  // Detect 403 → fall back to localStorage mode
  const is403 =
    (serversQuery.error as any)?.response?.status === 403 ||
    (serversQuery.error as any)?.status === 403;
  const [lsState, setLsState] = useState(lsRead);
  const useFallback = is403 || (serversQuery.isError && !serversQuery.isLoading);

  // Re-sync localStorage state when it changes
  useEffect(() => {
    if (useFallback) {
      setLsState(lsRead());
    }
  }, [useFallback]);

  /** Map of server names that exist in the backend (or localStorage fallback) */
  const connectedServers = useMemo(() => {
    const map = new Map<string, MCPConnectorInfo>();

    if (useFallback) {
      // localStorage fallback mode
      for (const [name] of Object.entries(lsState)) {
        map.set(name, {
          serverName: name,
          state: 'connected',
          toolCount: 0,
          tools: [],
        });
      }
      return map;
    }

    const servers = serversQuery.data ?? {};
    const tools = toolsQuery.data?.servers ?? {};
    const statuses = (statusQuery.data ?? {}) as Record<string, { connected?: boolean; error?: string }>;

    for (const [name, serverData] of Object.entries(servers)) {
      const serverTools = tools[name]?.tools ?? [];
      const status = statuses[name];

      // Determine connection state from real status
      let state: ConnectionState = 'connected';
      let error: string | undefined;
      if (status) {
        if (status.error) {
          state = 'error';
          error = status.error;
        } else if (status.connected === false) {
          state = 'disconnected';
        }
      }

      map.set(name, {
        serverName: name,
        state,
        toolCount: serverTools.length,
        tools: serverTools.map((t: { name: string; description?: string }) => ({
          name: t.name,
          description: t.description ?? '',
        })),
        error,
      });
    }

    return map;
  }, [useFallback, lsState, serversQuery.data, toolsQuery.data, statusQuery.data]);

  /** Check if a registry server ID is connected */
  const isConnected = useCallback(
    (registryId: string): boolean => {
      return connectedServers.has(registryId);
    },
    [connectedServers],
  );

  /** Get connection info for a registry server */
  const getConnectionInfo = useCallback(
    (registryId: string): MCPConnectorInfo | undefined => {
      return connectedServers.get(registryId);
    },
    [connectedServers],
  );

  /** Connect a registry server — creates via POST /api/mcp/servers, then reinitializes */
  const connect = useCallback(
    async (server: RegistryServer): Promise<{ success: boolean; error?: string; oauthUrl?: string }> => {
      const config = buildServerConfig(server);
      if (!config) {
        return {
          success: false,
          error: 'This connector requires server-side configuration. Add it in Settings > MCP Servers.',
        };
      }

      // Fallback: save to localStorage
      if (useFallback) {
        const current = lsRead();
        current[server.id] = { connectedAt: new Date().toISOString(), url: server.remoteUrl || '' };
        lsWrite(current);
        setLsState({ ...current });
        return { success: true };
      }

      try {
        // Check if server already exists in backend (YAML or previously created)
        const existingServers = serversQuery.data ?? {};
        const existingName = Object.keys(existingServers).find(
          (name) => name === server.id || name === server.name.toLowerCase().replace(/\s+/g, '-'),
        );

        if (existingName) {
          // Server exists — reinitialize it
          try {
            const result: any = await dataService.reinitializeMCPServer(existingName);
            if (result?.oauthUrl) {
              return { success: true, oauthUrl: result.oauthUrl };
            }
            // Refetch to update status
            serversQuery.refetch();
            toolsQuery.refetch();
            statusQuery.refetch();
          } catch (reinitErr: any) {
            // Reinitialize might return oauthUrl — that's OK, not an error
            const oauthUrl = reinitErr?.response?.data?.oauthUrl;
            if (oauthUrl) {
              return { success: true, oauthUrl };
            }
          }
          return { success: true };
        }

        // Server doesn't exist — create it
        const created: any = await createMutation.mutateAsync({
          config: config as any,
        });

        // Backend may return OAuth URL directly on creation
        if (created?.oauthUrl) {
          return { success: true, oauthUrl: created.oauthUrl };
        }

        // After creation, reinitialize to establish connection
        try {
          const reinit: any = await dataService.reinitializeMCPServer(server.id);
          if (reinit?.oauthUrl) {
            return { success: true, oauthUrl: reinit.oauthUrl };
          }
        } catch (reinitErr: any) {
          const oauthUrl = reinitErr?.response?.data?.oauthUrl;
          if (oauthUrl) {
            return { success: true, oauthUrl };
          }
        }

        return { success: true };
      } catch (err: any) {
        // If API returns 403, switch to localStorage fallback
        if (err?.response?.status === 403) {
          const current = lsRead();
          current[server.id] = { connectedAt: new Date().toISOString(), url: server.remoteUrl || '' };
          lsWrite(current);
          setLsState({ ...current });
          return { success: true };
        }
        const message = err?.response?.data?.message || err?.message || 'Connection failed';
        return { success: false, error: message };
      }
    },
    [createMutation, useFallback, serversQuery, toolsQuery, statusQuery],
  );

  /** Refresh status after OAuth window closes */
  const refreshStatus = useCallback(() => {
    serversQuery.refetch();
    toolsQuery.refetch();
    statusQuery.refetch();
  }, [serversQuery, toolsQuery, statusQuery]);

  /** Disconnect a server — calls DELETE /api/mcp/servers/:name or localStorage fallback */
  const disconnect = useCallback(
    async (serverName: string): Promise<{ success: boolean; error?: string }> => {
      if (useFallback) {
        const current = lsRead();
        delete current[serverName];
        lsWrite(current);
        setLsState({ ...current });
        return { success: true };
      }

      try {
        await deleteMutation.mutateAsync(serverName);
        return { success: true };
      } catch (err: any) {
        if (err?.response?.status === 403) {
          const current = lsRead();
          delete current[serverName];
          lsWrite(current);
          setLsState({ ...current });
          return { success: true };
        }
        const message = err?.response?.data?.message || err?.message || 'Disconnect failed';
        return { success: false, error: message };
      }
    },
    [deleteMutation, useFallback],
  );

  /** Total connected count */
  const connectedCount = connectedServers.size;

  /** All connected server names */
  const connectedIds = useMemo(
    () => Array.from(connectedServers.keys()),
    [connectedServers],
  );

  /** Whether any API call is in flight */
  const isLoading = serversQuery.isLoading || toolsQuery.isLoading;

  /** Whether the backend is reachable (403 = reachable but no MCP perms) */
  const isBackendAvailable = !serversQuery.isError || is403;

  return {
    // State
    connectedServers,
    connectedCount,
    connectedIds,
    isLoading,
    isBackendAvailable,
    isConnecting: createMutation.isLoading,
    isDisconnecting: deleteMutation.isLoading,

    // Actions
    connect,
    disconnect,
    isConnected,
    getConnectionInfo,
    refreshStatus,

    // Raw queries (for advanced use)
    serversQuery,
    toolsQuery,
    statusQuery,
  };
}
