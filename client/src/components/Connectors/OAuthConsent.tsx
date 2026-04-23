import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Check,
  Loader2,
  X,
  AlertTriangle,
  Link2,
  Copy,
  Terminal,
  ExternalLink,
  Download,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
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
  const { connect, refreshStatus } = useMCPConnectors();
  const Icon = getIcon(server.icon);
  const isStdio = server.transportType === 'stdio';
  const [phase, setPhase] = useState<Phase>(isStdio ? 'install' : 'config');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(server.remoteUrl || '');
  const [copied, setCopied] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  const toolDescriptions = getToolDescriptions(server.id);
  const needsUrl = !server.remoteUrl && !isStdio;
  const isUrlValid = /^https?:\/\/.+/.test(serverUrl.trim());

  const installCommand = (() => {
    if (!server.command) return '';
    const parts = [server.command, ...(server.args || [])];
    return parts.join(' ');
  })();

  const yamlSnippet = (() => {
    if (!isStdio || !server.command) return '';
    const envBlock = (server.requiredEnv || []).length
      ? `\n      env:\n${(server.requiredEnv || [])
          .map((k) => `        ${k}: "\${${k}}"`)
          .join('\n')}`
      : '';
    const argsBlock = server.args?.length
      ? `\n      args:\n${server.args.map((a) => `        - "${a}"`).join('\n')}`
      : '';
    return `mcpServers:
  ${server.id}:
      type: stdio
      command: ${server.command}${argsBlock}${envBlock}`;
  })();

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

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
          /* Install screen for stdio servers */
          <>
            <div className="flex flex-col items-center border-b border-white/10 px-6 pb-5 pt-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">{server.name}</h2>
              <p className="mt-1 max-w-xs text-center text-xs text-white/60">
                Ce connecteur s'installe localement sur votre machine — aucune URL cloud n'existe.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-white/60">
                <Terminal className="h-2.5 w-2.5" /> Installation locale
              </span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                  1. Commande d'installation
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2.5 font-mono text-[11px] text-white/90">
                  <Terminal className="h-3 w-3 flex-shrink-0 text-white/40" />
                  <code className="flex-1 truncate">{installCommand}</code>
                  <button
                    onClick={() => copy(installCommand, 'cmd')}
                    className="flex-shrink-0 rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                    aria-label="Copier"
                  >
                    {copied === 'cmd' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-white/40">
                  Exécutez dans votre terminal — requiert{' '}
                  {server.command === 'uvx' ? 'Python + uv' : 'Node.js + npm'}
                </p>
              </div>

              {(server.requiredEnv?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                    2. Variables d'environnement requises
                  </p>
                  <div className="space-y-1">
                    {(server.requiredEnv || []).map((env) => (
                      <div
                        key={env}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[11px] text-amber-400/90"
                      >
                        <span className="h-1 w-1 rounded-full bg-amber-400" />
                        {env}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                  {(server.requiredEnv?.length ?? 0) > 0 ? '3' : '2'}. Ajouter à{' '}
                  <code className="rounded bg-white/10 px-1">librechat.yaml</code>
                </p>
                <div className="relative rounded-lg border border-white/10 bg-black p-3">
                  <button
                    onClick={() => copy(yamlSnippet, 'yaml')}
                    className="absolute right-2 top-2 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                    aria-label="Copier"
                  >
                    {copied === 'yaml' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <pre className="overflow-x-auto whitespace-pre font-mono text-[10px] leading-relaxed text-white/80">
                    {yamlSnippet}
                  </pre>
                </div>
                <p className="mt-1 text-[10px] text-white/40">
                  Redémarrez LibreChat après modification du fichier.
                </p>
              </div>

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

            <div className="flex gap-2 border-t border-white/10 px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Fermer
              </button>
              <button
                onClick={() => copy(yamlSnippet, 'yaml')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                {copied === 'yaml' ? 'Copié !' : 'Copier la config'}
              </button>
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
