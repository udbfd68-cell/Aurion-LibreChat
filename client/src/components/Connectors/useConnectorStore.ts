import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'librechat_connectors';

interface ConnectorConfig {
  connectedAt: string;
  env: Record<string, string>;
}

interface ConnectorStore {
  configs: Record<string, ConnectorConfig>;
}

function getSnapshot(): ConnectorStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ConnectorStore;
    }
  } catch {
    // ignore
  }
  return { configs: {} };
}

function save(store: ConnectorStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  cachedStore = store;
  // Notify all subscribers
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

let cachedStore = getSnapshot();

function subscribe(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedStore = getSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getStoreSnapshot() {
  return cachedStore;
}

export function useConnectorStore() {
  const store = useSyncExternalStore(subscribe, getStoreSnapshot);

  const connect = useCallback((id: string, env: Record<string, string>) => {
    const current = getSnapshot();
    current.configs[id] = {
      connectedAt: new Date().toISOString(),
      env,
    };
    save(current);
  }, []);

  const disconnect = useCallback((id: string) => {
    const current = getSnapshot();
    delete current.configs[id];
    save(current);
  }, []);

  const isConnected = useCallback(
    (id: string) => id in store.configs,
    [store],
  );

  const getConfig = useCallback(
    (id: string) => store.configs[id] ?? null,
    [store],
  );

  const connectedIds = useMemo(() => Object.keys(store.configs), [store]);
  const connectedCount = connectedIds.length;

  return {
    connect,
    disconnect,
    isConnected,
    getConfig,
    connectedIds,
    connectedCount,
    configs: store.configs,
  };
}
