import { useState, useEffect } from 'react';
import { X, Check, Key, Unplug, Loader2 } from 'lucide-react';
import type { RegistryServer } from './registryData';
import { getIcon } from './iconMap';
import { useConnectorStore } from './useConnectorStore';
import { cn } from '~/utils';

interface Props {
  server: RegistryServer;
  onClose: () => void;
}

export default function ConnectorConfigModal({ server, onClose }: Props) {
  const { connect, disconnect, isConnected, getConfig } = useConnectorStore();
  const connected = isConnected(server.id);
  const existing = getConfig(server.id);
  const Icon = getIcon(server.icon);

  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setEnvValues(existing.env);
    } else {
      const init: Record<string, string> = {};
      for (const key of server.requiredEnv) {
        init[key] = '';
      }
      setEnvValues(init);
    }
  }, [existing, server.requiredEnv]);

  const handleConnect = () => {
    // Validate all required fields are filled
    for (const key of server.requiredEnv) {
      if (!envValues[key]?.trim()) {
        setError(`${key} is required`);
        return;
      }
    }
    setError('');
    setConnecting(true);

    // Simulate connection (in real app this would test the credentials)
    setTimeout(() => {
      connect(server.id, envValues);
      setConnecting(false);
    }, 800);
  };

  const handleDisconnect = () => {
    disconnect(server.id);
  };

  const noKeysRequired = server.requiredEnv.length === 0;

  const handleQuickConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      connect(server.id, {});
      setConnecting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border-light bg-surface-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-light px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-tertiary">
            <Icon className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-text-primary">{server.name}</h2>
            <p className="text-xs text-text-secondary">{server.description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {connected ? (
            /* Connected state */
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-secondary p-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-text-primary">Connected</span>
                <span className="ml-auto text-xs text-text-tertiary">
                  {existing?.connectedAt
                    ? new Date(existing.connectedAt).toLocaleDateString()
                    : ''}
                </span>
              </div>

              {Object.keys(existing?.env || {}).length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-medium text-text-secondary">Configured keys</p>
                  {Object.entries(existing?.env || {}).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2"
                    >
                      <Key className="h-3 w-3 text-text-tertiary" />
                      <span className="text-xs font-mono text-text-secondary">{key}</span>
                      <span className="ml-auto text-xs text-text-tertiary">
                        {'•'.repeat(Math.min(val.length, 20))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleDisconnect}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-medium px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          ) : noKeysRequired ? (
            /* No keys needed — instant connect */
            <div>
              <div className="mb-4 rounded-lg bg-surface-secondary p-4 text-center">
                <p className="text-sm text-text-secondary">
                  No API keys required. This connector is ready to use.
                </p>
              </div>

              <button
                onClick={handleQuickConnect}
                disabled={connecting}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                  connecting
                    ? 'cursor-not-allowed bg-text-tertiary'
                    : 'bg-text-primary hover:opacity-90',
                )}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          ) : (
            /* API key form */
            <div>
              <div className="mb-4 space-y-3">
                {server.requiredEnv.map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      {key}
                    </label>
                    <input
                      type="password"
                      value={envValues[key] || ''}
                      onChange={(e) =>
                        setEnvValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={`Enter ${key}`}
                      className="w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-border-heavy focus:outline-none focus:ring-1 focus:ring-border-heavy"
                    />
                  </div>
                ))}
              </div>

              {error && (
                <p className="mb-3 text-xs text-red-500">{error}</p>
              )}

              <button
                onClick={handleConnect}
                disabled={connecting}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                  connecting
                    ? 'cursor-not-allowed bg-text-tertiary'
                    : 'bg-text-primary hover:opacity-90',
                )}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>

              {server.docsUrl && (
                <a
                  href={server.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs text-text-tertiary hover:text-text-secondary hover:underline"
                >
                  How to get your API keys →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
