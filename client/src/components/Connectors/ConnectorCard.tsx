import { useState, useCallback } from 'react';
import { Plug2, X, Loader2, Wrench } from 'lucide-react';
import type { RegistryServer } from './registryData';
import { getIcon } from './iconMap';
import { useMCPConnectors } from './useMCPConnectors';
import OAuthConsent from './OAuthConsent';

export default function ConnectorCard({ server }: { server: RegistryServer }) {
  const { isConnected, disconnect, getConnectionInfo } = useMCPConnectors();
  const connected = isConnected(server.id);
  const info = getConnectionInfo(server.id);
  const [showConnect, setShowConnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const Icon = getIcon(server.icon);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    await disconnect(server.id);
    setDisconnecting(false);
  }, [disconnect, server.id]);

  return (
    <>
      <div className="group flex items-center gap-3 rounded-xl border border-border-light bg-surface-primary px-4 py-3 transition-all hover:border-border-heavy hover:shadow-sm">
        {/* Icon */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-tertiary">
          <Icon className="h-4.5 w-4.5 text-text-secondary" />
        </div>

        {/* Name + description + tool count */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{server.name}</span>
            {connected && (
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  Connected
                </span>
              </div>
            )}
            {connected && info && info.toolCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                <Wrench className="h-2.5 w-2.5" />
                {info.toolCount} tool{info.toolCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-xs text-text-tertiary">{server.description}</p>
        </div>

        {/* Action */}
        {disconnecting ? (
          <div className="flex h-8 items-center gap-1.5 rounded-lg border border-border-medium px-3 text-xs font-medium text-text-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        ) : connected ? (
          <button
            onClick={handleDisconnect}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border-medium px-3 text-xs font-medium text-text-secondary transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setShowConnect(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-text-primary px-3 text-xs font-medium text-surface-primary transition-colors hover:opacity-90"
          >
            {server.transportType === 'stdio' ? (
              <>
                <Wrench className="h-3.5 w-3.5" />
                Installer
              </>
            ) : (
              <>
                <Plug2 className="h-3.5 w-3.5" />
                {server.authType === 'oauth' ? 'Se connecter' : 'Connecter'}
              </>
            )}
          </button>
        )}
      </div>

      {showConnect && (
        <OAuthConsent server={server} onClose={() => setShowConnect(false)} />
      )}
    </>
  );
}