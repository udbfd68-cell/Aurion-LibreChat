import { useState, useCallback, useRef, useEffect } from 'react';
import { request } from 'librechat-data-provider';

interface MCPRouterResponse {
  servers: string[];
}

/**
 * useMCPRouter — contextual MCP routing.
 *
 * Given the current textarea value, calls `POST /api/mcp/route` with a
 * 400ms debounce and exposes the list of MCP servers that should be
 * contextually active for this message. Empty/whitespace input clears
 * the list immediately (no network call).
 */
export function useMCPRouter() {
  const [activeServers, setActiveServers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doRoute = useCallback(async (message: string): Promise<string[]> => {
    const trimmed = (message ?? '').trim();
    if (trimmed.length === 0) {
      setActiveServers([]);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const data = (await request.post('/api/mcp/route', {
        message: trimmed,
      })) as MCPRouterResponse;
      const servers = Array.isArray(data?.servers) ? data.servers : [];
      setActiveServers(servers);
      return servers;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActiveServers([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const routeMessage = useCallback(
    (message: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const trimmed = (message ?? '').trim();
      if (trimmed.length === 0) {
        setActiveServers([]);
        setIsLoading(false);
        return;
      }
      debounceTimerRef.current = setTimeout(() => {
        void doRoute(trimmed);
      }, 400);
    },
    [doRoute],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return {
    activeServers,
    isLoading,
    error,
    routeMessage,
  };
}

export default useMCPRouter;
