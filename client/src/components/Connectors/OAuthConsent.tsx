import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Shield,
  Check,
  Loader2,
  X,
  AlertTriangle,
  Link2,
  Terminal,
  ExternalLink,
  BookOpen,
  Key,
  Download,
} from 'lucide-react';
import { dataService, Constants } from 'librechat-data-provider';
import { useUpdateUserPluginsMutation } from 'librechat-data-provider/react-query';
import type { RegistryServer } from './registryData';
import { getIcon } from './iconMap';
import { useMCPConnectors } from './useMCPConnectors';

const TOOL_DESCRIPTIONS: Record<string, string[]> = {
  'google-drive': ['Voir et télécharger vos fichiers Drive', 'Rechercher dans Docs, Sheets, Slides'],
  'google-calendar': ['Voir et gérer vos événements', 'Créer et mettre à jour des réunions'],
  'google-docs': ['Lire, créer et éditer des Google Docs', 'Collaboration temps réel'],
  'google-sheets': ['Lire, écrire et formater des feuilles', 'Exécuter des formules'],
  gmail: ['Lire et rechercher vos emails', 'Envoyer des emails en votre nom'],
  github: ['Accéder à vos dépôts et code', 'Voir issues, pull requests, actions'],
  gitlab: ['Accéder à vos dépôts et merge requests', 'Voir pipelines et issues'],
  slack: ['Lire les messages de vos canaux', 'Envoyer des messages en votre nom'],
  notion: ['Rechercher et lire vos pages', 'Créer et mettre à jour du contenu'],
  linear: ['Voir et gérer les issues', 'Accéder aux projets et cycles'],
  jira: ['Voir et gérer les tickets', 'Accéder aux sprints et tableaux'],
  stripe: ['Gérer paiements et clients', 'Abonnements et factures'],
  default: ['Accéder aux données de votre compte', 'Effectuer des actions en votre nom'],
};

function getToolDescriptions(serverId: string): string[] {
  return TOOL_DESCRIPTIONS[serverId] || TOOL_DESCRIPTIONS.default;
}

type Phase = 'config' | 'connecting' | 'oauth-waiting' | 'done' | 'error' | 'install';

interface Props {
  server: RegistryServer;
  onClose: () => void;
}

export default function OAuthConsent({ server, onClose }: Props) {
  const { connect, refreshStatus, serversQuery } = useMCPConnectors();
  const updateUserPlugins = useUpdateUserPluginsMutation();
  const Icon = getIcon(server.icon);
  const isStdio = server.transportType === 'stdio';
  const [phase, setPhase] = useState<Phase>(isStdio ? 'install' : 'config');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(server.remoteUrl || '');
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  const toolDescriptions = getToolDescriptions(server.id);
  const needsUrl = !server.remoteUrl && !isStdio;
  const isUrlValid = /^https?:\/\/.+/.test(serverUrl.trim());

  /** Is this stdio server pre-configured by admin on the server side? */
  const backendServerName = useMemo(() => {
    const existing = serversQuery.data ?? {};
    const candidates = [server.id, `${server.id}-local`, server.name.toLowerCase()];
    return Object.keys(existing).find((n) => candidates.includes(n)) ?? null;
  }, [serversQuery.data, server.id, server.name]);

  const isServerSideAvailable = !!backendServerName;

  /** Fields to show: prefer backend-declared customUserVars, fall back to registry requiredEnv */
  const envFields = useMemo(() => {
    const existing: any = backendServerName ? serversQuery.data?.[backendServerName] : null;
    if (existing?.customUserVars && typeof existing.customUserVars === 'object') {
      return Object.entries(existing.customUserVars).map(([key, meta]: [string, any]) => ({
        key,
        title: meta?.title || key,
        description: meta?.description || '',
      }));
    }
    return (server.requiredEnv || []).map((k) => ({ key: k, title: k, description: '' }));
  }, [backendServerName, serversQuery.data, server.requiredEnv]);

  const allFilled = envFields.every((f) => (envValues[f.key] || '').trim().length > 0);

  /** Generate a Claude Desktop config.json for manual install (fallback) */
  const downloadClaudeConfig = useCallback(() => {
    if (!server.command) return;
    const envObj: Record<string, string> = {};
    for (const f of envFields) {
      envObj[f.key] = envValues[f.key] || `YOUR_${f.key}`;
    }
    const config = {
      mcpServers: {
        [server.id]: {
          command: server.command,
          args: server.args || [],
          ...(Object.keys(envObj).length ? { env: envObj } : {}),
        },
      },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.id}-mcp-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [server, envFields, envValues]);

  /** Install the stdio server server-side: save secrets + reinitialize */
  const handleStdioInstall = useCallback(async () => {
    if (!backendServerName) {
      setPhase('error');
      setError(
        "Ce serveur n'est pas pré-configuré côté serveur. Téléchargez la config pour Claude Desktop ou contactez l'administrateur.",
      );
      return;
    }
    setPhase('connecting');
    setError('');
    try {
      // Save secrets per-user
      const filteredAuth: Record<string, string> = {};
      for (const [k, v] of Object.entries(envValues)) {
        if (v && v.trim()) filteredAuth[k] = v.trim();
      }
      if (Object.keys(filteredAuth).length > 0) {
        await updateUserPlugins.mutateAsync({
          pluginKey: `${Constants.mcp_prefix}${backendServerName}`,
          action: 'install',
          auth: filteredAuth,
          isEntityTool: true,
        });
      }
      // Start the server
      const result: any = await dataService.reinitializeMCPServer(backendServerName);
      if (result?.oauthUrl) {
        openOAuthPopup(result.oauthUrl);
        return;
      }
      refreshStatus();
      setPhase('done');
    } catch (err: any) {
      setPhase('error');
      setError(
        err?.response?.data?.message || err?.message || "Installation impossible. Réessayez.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendServerName, envValues, updateUserPlugins, refreshStatus]);

  /** Open OAuth provider in a popup and poll until it closes */
  const openOAuthPopup = useCallback(
    (url: string) => {
      setPhase('oauth-waiting');
      const w = 520;
      const h = 680;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        url,
        'mcp_oauth',
        `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
      );
      popupRef.current = popup;

      if (!popup) {
        setPhase('error');
        setError(
          "Impossible d'ouvrir la fenêtre OAuth. Autorisez les popups pour ce site puis réessayez.",
        );
        return;
      }

      // Poll for popup closure
      pollRef.current = window.setInterval(() => {
        if (popup.closed) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          // Refresh status and assume success — backend will reflect real state
          refreshStatus();
          setPhase('done');
        }
      }, 500);
    },
    [refreshStatus],
  );

  const handleConnect = useCallback(async () => {
    if (needsUrl && !isUrlValid) {
      setError('Entrez une URL MCP valide (https://...)');
      return;
    }

    setPhase('connecting');
    setError('');

    const serverWithUrl: RegistryServer = {
      ...server,
      remoteUrl: serverUrl.trim() || server.remoteUrl,
      transportType: server.transportType === 'stdio' ? 'streamable-http' : server.transportType,
    };

    const result = await connect(serverWithUrl);

    if (result.oauthUrl) {
      openOAuthPopup(result.oauthUrl);
      return;
    }

    if (result.success) {
      setPhase('done');
    } else {
      setPhase('error');
      setError(result.error || 'Connexion échouée. Vérifiez et réessayez.');
    }
  }, [connect, server, serverUrl, isUrlValid, needsUrl, openOAuthPopup]);

  // Auto-close after success
  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(onClose, 1800);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && phase !== 'oauth-waiting' && onClose()}
    >
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        {phase !== 'oauth-waiting' && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {phase === 'done' ? (
          <div className="flex flex-col items-center px-6 py-10">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-base font-semibold text-white">Connecté</h2>
            <p className="mt-1 text-center text-xs text-white/60">
              {server.name} est maintenant disponible.
              <br />
              Les outils apparaîtront automatiquement dans le chat.
            </p>
          </div>
        ) : phase === 'connecting' ? (
          <div className="flex flex-col items-center px-6 py-10">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
              <Loader2 className="h-7 w-7 animate-spin text-white/70" />
            </div>
            <h2 className="text-base font-semibold text-white">Connexion à {server.name}...</h2>
            <p className="mt-1 text-xs text-white/50">Établissement de la connexion MCP</p>
          </div>
        ) : phase === 'oauth-waiting' ? (
          /* Big OAuth popup screen like claude.ai */
          <div className="flex flex-col items-center px-6 py-10">
            <div className="relative mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="h-1 w-1 rounded-full bg-white/50 animate-pulse" />
                <span className="h-1 w-1 rounded-full bg-white/70 animate-pulse [animation-delay:200ms]" />
                <span className="h-1 w-1 rounded-full bg-white/90 animate-pulse [animation-delay:400ms]" />
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Shield className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white">Accorder l'accès à {server.name}</h2>
            <p className="mt-2 max-w-xs text-center text-xs leading-relaxed text-white/60">
              Complétez les étapes de connexion dans la nouvelle fenêtre.
              <br />
              Cette fenêtre se fermera automatiquement une fois terminé.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <button
                onClick={() => {
                  if (popupRef.current && !popupRef.current.closed) popupRef.current.focus();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Revenir à la fenêtre
              </button>
              <button
                onClick={() => {
                  if (pollRef.current) window.clearInterval(pollRef.current);
                  if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
                  setPhase('config');
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : phase === 'error' ? (
          <div className="flex flex-col items-center px-6 py-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-white">Connexion échouée</h2>
            <p className="mt-2 max-w-xs text-center text-xs text-white/60">{error}</p>
            <div className="mt-5 flex w-full gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Fermer
              </button>
              <button
                onClick={() => setPhase(isStdio ? 'install' : 'config')}
                className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:opacity-90"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : phase === 'install' ? (
          /* Clean install screen for stdio servers — no code snippets */
          <>
            <div className="flex flex-col items-center border-b border-white/10 px-6 pb-5 pt-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">{server.name}</h2>
              <p className="mt-1 max-w-xs text-center text-xs text-white/60">
                {isServerSideAvailable
                  ? envFields.length > 0
                    ? 'Entrez vos identifiants pour activer ce connecteur'
                    : 'Prêt à activer'
                  : 'Ce connecteur s\'installe sur votre machine'}
              </p>
              {isServerSideAvailable && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] text-green-400 ring-1 ring-green-500/30">
                  <Shield className="h-2.5 w-2.5" /> Géré côté serveur
                </span>
              )}
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
              {isServerSideAvailable ? (
                <>
                  {envFields.length > 0 ? (
                    <div className="space-y-3">
                      {envFields.map((f, idx) => (
                        <div key={f.key} className="space-y-1.5">
                          <label
                            htmlFor={`env-${f.key}`}
                            className="flex items-center gap-1.5 text-xs font-medium text-white/80"
                          >
                            <Key className="h-3 w-3 text-white/40" />
                            {f.title}
                          </label>
                          <input
                            id={`env-${f.key}`}
                            type="password"
                            autoFocus={idx === 0}
                            autoComplete="off"
                            spellCheck={false}
                            value={envValues[f.key] || ''}
                            onChange={(e) =>
                              setEnvValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            placeholder={`Collez votre ${f.title.toLowerCase()}`}
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-colors focus:border-white/30"
                          />
                          {f.description && (
                            <p
                              className="text-[10px] leading-relaxed text-white/50"
                              dangerouslySetInnerHTML={{ __html: f.description }}
                            />
                          )}
                        </div>
                      ))}
                      <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <Shield className="mt-0.5 h-3 w-3 flex-shrink-0 text-white/40" />
                        <p className="text-[10px] leading-relaxed text-white/60">
                          Vos identifiants sont chiffrés et stockés uniquement sur votre compte.
                          Ils ne sont jamais partagés.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="text-center text-xs text-white/70">
                        Aucun identifiant requis. Cliquez sur Activer pour démarrer.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    <div className="text-[11px] leading-relaxed text-amber-100/90">
                      Ce connecteur n'est pas pré-configuré sur Aurion. Il s'exécute
                      localement — téléchargez la config prête à l'emploi pour Claude Desktop
                      ou tout client MCP compatible.
                    </div>
                  </div>
                  {envFields.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                        Identifiants à renseigner (optionnel)
                      </p>
                      {envFields.map((f) => (
                        <input
                          key={f.key}
                          type="password"
                          autoComplete="off"
                          spellCheck={false}
                          value={envValues[f.key] || ''}
                          onChange={(e) =>
                            setEnvValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                          }
                          placeholder={f.title}
                          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                        />
                      ))}
                    </div>
                  )}
                  {server.docsUrl && (
                    <a
                      href={server.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        Documentation officielle
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Annuler
              </button>
              {isServerSideAvailable ? (
                <button
                  onClick={handleStdioInstall}
                  disabled={envFields.length > 0 && !allFilled}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Activer
                </button>
              ) : (
                <button
                  onClick={downloadClaudeConfig}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger config
                </button>
              )}
            </div>
          </>
        ) : (
          /* Config / consent screen for remote servers */
          <>
            <div className="flex flex-col items-center border-b border-white/10 px-6 pb-5 pt-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">{server.name}</h2>
              <p className="mt-1 max-w-xs text-center text-xs text-white/60">
                {needsUrl
                  ? "Entrez l'URL du serveur MCP pour se connecter"
                  : server.authType === 'oauth'
                    ? 'Vous serez redirigé vers la page de connexion officielle'
                    : 'Connectez ce service pour utiliser ses outils dans vos conversations'}
              </p>
              {!needsUrl && server.remoteUrl && !server.remoteUrl.includes('smithery.ai') && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] text-green-400">
                  <Check className="h-2.5 w-2.5" />
                  URL officielle
                </span>
              )}
            </div>

            <div className="px-6 py-4">
              {needsUrl && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-white/70">
                    URL du serveur MCP
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                    <input
                      type="url"
                      value={serverUrl}
                      onChange={(e) => {
                        setServerUrl(e.target.value);
                        setError('');
                      }}
                      placeholder="https://mcp.example.com/sse"
                      className="w-full rounded-lg border border-white/10 bg-black py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <p className="mb-3 text-xs font-medium text-white/70">Cette intégration peut :</p>
              <div className="space-y-2.5">
                {toolDescriptions.map((desc) => (
                  <div key={desc} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    </div>
                    <span className="text-xs text-white/90">{desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/5 p-2.5">
                <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" />
                <p className="text-[10px] leading-relaxed text-white/50">
                  Connexion gérée côté serveur. Les identifiants sont chiffrés.
                  {server.authType === 'oauth' &&
                    " Une fenêtre OAuth officielle s'ouvrira pour l'authentification."}
                </p>
              </div>

              {!needsUrl && server.remoteUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                  <Link2 className="h-3 w-3 flex-shrink-0 text-white/40" />
                  <span className="truncate font-mono text-[10px] text-white/50">
                    {server.remoteUrl}
                  </span>
                </div>
              )}

              {error && phase === 'config' && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={handleConnect}
                disabled={needsUrl && !isUrlValid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
              >
                {server.authType === 'oauth' ? (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Se connecter
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Connecter
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
