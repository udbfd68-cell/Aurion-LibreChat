import { useState, useCallback, useRef } from 'react';

interface MCPRouterResponse {
  servers: string[];
}

export function useMCPRouter() {
  const [activeServers, setActiveServers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const routeMessage = useCallback(async (message: string): Promise<string[]> => {
    if (!message || message.trim().length === 0) {
      setActiveServers([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mcp/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MCPRouterResponse = await response.json();
      setActiveServers(data.servers);
      return data.servers;
    } catch (err) {
      console.error('MCP Router error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActiveServers([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced version to avoid excessive API calls
  const debouncedRoute = useCallback(
    (message: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        routeMessage(message);
      }, 500);
    },
    [routeMessage],
  );

  return {
    activeServers,
    isLoading,
    error,
    routeMessage: debouncedRoute,
  };
}

export default useMCPRouter;
