/**
 * useAutoConnectMCP — Auto-activates MCP connectors that require no auth.
 *
 * Runs once per browser (guarded by localStorage flag). Targets the curated
 * "featured + remoteUrl + no authType + no requiredEnv" subset so the user
 * gets claude.ai-style plug-and-play tooling without any setup clicks.
 *
 * Silent: errors are swallowed (user can still connect manually from the
 * Connectors page). Fallback 403 path is handled inside `useMCPConnectors`.
 */
import { useEffect, useRef } from 'react';
import { useMCPConnectors } from './useMCPConnectors';
import { MCP_SERVERS, type RegistryServer } from './registryData';

const RAN_KEY = 'librechat_mcp_autoconnect_v1';

function isNoAuth(server: RegistryServer): boolean {
  return (
    server.featured === true &&
    !!server.remoteUrl &&
    !server.authType &&
    !server.oauth &&
    (server.requiredEnv?.length ?? 0) === 0
  );
}

export function useAutoConnectMCP() {
  const { connect, isConnected, isLoading, isBackendAvailable } = useMCPConnectors();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    if (isLoading || !isBackendAvailable) {
      return;
    }

    let alreadyRan = false;
    try {
      alreadyRan = localStorage.getItem(RAN_KEY) === '1';
    } catch {
      return;
    }
    if (alreadyRan) {
      return;
    }

    startedRef.current = true;

    const candidates = MCP_SERVERS.filter(isNoAuth).filter((s) => !isConnected(s.id));
    if (candidates.length === 0) {
      try {
        localStorage.setItem(RAN_KEY, '1');
      } catch {
        /* ignore */
      }
      return;
    }

    (async () => {
      for (const server of candidates) {
        try {
          await connect(server);
        } catch {
          /* non-fatal — user can retry from UI */
        }
      }
      try {
        localStorage.setItem(RAN_KEY, '1');
      } catch {
        /* ignore */
      }
    })();
  }, [connect, isConnected, isLoading, isBackendAvailable]);
}
