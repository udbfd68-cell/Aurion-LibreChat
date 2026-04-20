import { useState, useEffect, useCallback } from 'react';
import { Shield, Check, Loader2, X, ExternalLink, AlertTriangle, Link2 } from 'lucide-react';
import type { RegistryServer } from './registryData';
import { getIcon } from './iconMap';
import { useMCPConnectors } from './useMCPConnectors';

/** Tool descriptions shown after successful connection */
const TOOL_DESCRIPTIONS: Record<string, string[]> = {
  'google-drive': ['View and download files in your Drive', 'Search across Docs, Sheets, and Slides'],
  'google-calendar': ['View and manage your calendar events', 'Create and update meetings'],
  'google-docs': ['Read, create, and edit Google Docs', 'Real-time collaboration and version history'],
  'google-sheets': ['Read, write, and format spreadsheets', 'Run formulas and manage sheets'],
  'google-slides': ['Create and edit presentations', 'Manage slides, templates, and formatting'],
  'google-tasks': ['View and manage your tasks', 'Integrate with Gmail and Calendar'],
  gmail: ['Read and search your emails', 'Send emails on your behalf'],
  github: ['Access your repositories and code', 'View issues, pull requests, and actions'],
  gitlab: ['Access your repositories and merge requests', 'View pipelines and issues'],
  slack: ['Read messages in your channels', 'Send messages on your behalf'],
  notion: ['Search and read your pages', 'Create and update content'],
  linear: ['View and manage issues', 'Access projects and cycles'],
  jira: ['View and manage tickets', 'Access sprints and boards'],
  asana: ['View tasks and projects', 'Create and update work items'],
  'microsoft-365': ['Access Outlook mail and calendar', 'View OneDrive files'],
  'microsoft-teams': ['Chat and video meetings', 'File storage and collaboration'],
  discord: ['Read and send messages', 'Access server channels'],
  postgres: ['Execute read-only queries', 'Inspect database schemas'],
  supabase: ['Manage database, auth, and storage', 'Create edge functions and migrations'],
  neon: ['Create databases and run queries', 'Manage branches and schemas'],
  prisma: ['Query database schemas', 'Explore models and manage migrations'],
  stripe: ['Manage payments and customers', 'Handle subscriptions and invoices'],
  sentry: ['View errors and performance data', 'Access issue tracking'],
  cloudflare: ['Manage Workers and KV stores', 'Access R2 and D1'],
  vercel: ['Manage deployments and projects', 'Configure domains and env vars'],
  'brave-search': ['Search web pages, news, and images', 'Rich structured results'],
  exa: ['AI-powered semantic web search', 'Find similar pages and code'],
  tavily: ['AI search with structured results', 'Source-backed answers'],
  fetch: ['Fetch content from any web URL', 'Convert HTML to markdown'],
  memory: ['Save and search long-term memories', 'Manage facts and preferences'],
  context7: ['Browse up-to-date library docs', 'Code examples for any framework'],
  spotify: ['Browse and search music', 'Manage playlists and playback'],
  youtube: ['Search videos and transcripts', 'Channel info and metadata'],
  instagram: ['Manage posts and stories', 'View analytics and insights'],
  reddit: ['Browse subreddits and posts', 'Read comments and discussions'],
  huggingface: ['Discover AI models and datasets', 'Access model documentation'],
  gemini: ['Veo 3 video generation', 'Flash text and multimodal AI'],
  todoist: ['Manage tasks and projects', 'Set deadlines and collaborate'],
  airtable: ['Read and write records', 'Manage tables and views'],
  zapier: ['Automate workflows across 7,000+ apps', 'Create and trigger zaps'],
  n8n: ['Manage workflows and automations', 'Run executions and manage credentials'],
  deepwiki: ['Explore GitHub repo documentation', 'Ask questions, get concise answers'],
  // CRM & Sales
  hubspot: ['Contacts, deals, pipelines, tickets', 'Email sequences et marketing automation'],
  salesforce: ['Leads, opportunities, accounts, forecasts', 'Rapports et dashboards temps réel'],
  pipedrive: ['Pipeline visuel, deals, activités', 'Prévisions de revenus et emails'],
  'close-crm': ['Appels, emails, SMS, lead scoring', 'Séquences automatisées et pipeline'],
  attio: ['Relations et workflows custom', 'Enrichissement automatique de contacts'],
  'zoho-crm': ['Contacts, deals, campagnes, workflows', 'CRM + email + facturation Zoho'],
  dynamics365: ['Ventes, service, finance, opérations', 'ERP + CRM Microsoft intégré'],
  // Prospection & Lead Gen
  prospector: ['Recherche emails de prospects', 'Validation d\'adresses et listes de leads'],
  'lead-gen': ['Génération de leads gratuite', 'Enrichissement et trouveur d\'emails'],
  'sales-intelligence': ['12-en-1 sales intelligence', 'Scoring, CRM sync, email outreach'],
  datamerge: ['Enrichissement profils LinkedIn', 'Hiérarchies et lookalikes d\'entreprises'],
  'cold-email': ['Séquences d\'emails à froid', 'Campagnes personnalisées par lot'],
  'common-room': ['Signaux communautaires cross-canal', 'Leads qualifiés par produit'],
  'google-maps-leads': ['Scraper Google Maps B2B', 'Validation emails et infos business'],
  // Email Marketing
  mailchimp: ['Campagnes email et audiences', 'Segmentation et analytics d\'engagement'],
  klaviyo: ['Email + SMS marketing e-commerce', 'Flows automatisés et taux d\'ouverture'],
  mailerlite: ['Campagnes et workflows email', 'Landing pages et abonnés'],
  // Social Media
  linkedin: ['Posts, profil, pages entreprise', 'Networking et engagement pro'],
  twitter: ['Tweets, threads, timeline, mentions', 'Likes, retweets et gestion communauté'],
  postpulse: ['Publication multi-plateforme', 'Instagram, Facebook, LinkedIn, TikTok, YouTube'],
  'vibe-marketing': ['Création de contenu IA', 'Templates et frameworks pour réseaux sociaux'],
  supermetrics: ['Données marketing 150+ plateformes', 'Rapports cross-canal et ROI'],
  // SEO & Ads
  'google-search-console': ['Positions, clics, impressions', 'Couverture d\'index et erreurs crawl'],
  'google-ads': ['Campagnes pub Google', 'Enchères, audiences, conversions'],
  ahrefs: ['Backlinks, keywords, ranking', 'Audit SEO et analyse concurrence'],
  'meta-ads': ['Facebook/Instagram Ads', 'ROAS, CPA, audit et optimisation'],
  // Comptabilité & Facturation
  quickbooks: ['Factures, dépenses, rapprochement', 'Rapports financiers et TVA'],
  xero: ['Facturation et rapprochement bancaire', 'Notes de frais et reporting'],
  freshbooks: ['Devis, factures, suivi du temps', 'Comptabilité PME simplifiée'],
  'zoho-books': ['Comptabilité et facturation', 'Suivi dépenses et collaboration'],
  harvest: ['Suivi du temps facturable', 'Projets, factures et notes de frais'],
  paypal: ['Paiements et liens de paiement', 'Factures et suivi des transactions'],
  square: ['Encaissements cartes et TPE', 'Abonnements et suivi des ventes'],
  // Support Client
  zendesk: ['Tickets support et help center', 'SLA, agents et base de connaissances'],
  intercom: ['Chat live et tickets', 'Messages ciblés et réponses automatisées'],
  gorgias: ['Helpdesk e-commerce automatisé', 'Gestion commandes et communication client'],
  // E-Commerce
  shopify: ['Produits, commandes, stock, clients', 'Fulfillment et rapports de vente'],
  wix: ['Site web drag-and-drop', 'Pages, contenu, domaines et publication'],
  // RH & Recrutement
  gusto: ['Paie, avantages sociaux, conformité', 'Onboarding, congés, déclarations'],
  jobgpt: ['Candidatures automatisées', 'CV sur mesure et outreach recruteurs'],
  // Planning
  calendly: ['Planification de RDV automatisée', 'Types d\'événements et disponibilité'],
  // Stockage & Fichiers
  dropbox: ['Sync fichiers et dossiers partagés', 'Permissions et collaboration'],
  // Formulaires
  jotform: ['Formulaires et enquêtes en ligne', 'Workflows automatisés et collecte'],
  surveymonkey: ['Sondages et distribution', 'Segmentation et rapports statistiques'],
  typeform: ['Formulaires conversationnels', 'Logique conditionnelle et multi-pages'],
  // Gestion de projet
  monday: ['Gestion de projet customisable', 'Collaboration, agile et automation'],
  clickup: ['Tâches, docs, timers, tags', 'Workspace tout-en-un'],
  // WhatsApp
  whatsapp: ['Messages WhatsApp Business', 'Templates, chatbots et campagnes'],
  // Google Super
  'google-super': ['Drive, Calendar, Gmail, Sheets', 'Analytics, Ads — tout Google unifié'],
  default: ['Access your account data', 'Perform actions on your behalf'],
};

function getToolDescriptions(serverId: string): string[] {
  return TOOL_DESCRIPTIONS[serverId] || TOOL_DESCRIPTIONS.default;
}

type Phase = 'config' | 'connecting' | 'done' | 'error';

interface Props {
  server: RegistryServer;
  onClose: () => void;
}

export default function OAuthConsent({ server, onClose }: Props) {
  const { connect } = useMCPConnectors();
  const Icon = getIcon(server.icon);
  const [phase, setPhase] = useState<Phase>('config');
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(server.remoteUrl || '');
  const toolDescriptions = getToolDescriptions(server.id);

  const needsUrl = !server.remoteUrl;
  const isUrlValid = /^https?:\/\/.+/.test(serverUrl.trim());

  const handleConnect = useCallback(async () => {
    if (!isUrlValid && needsUrl) {
      setError('Enter a valid MCP server URL (https://...)');
      return;
    }

    setPhase('connecting');
    setError('');

    // Build a server object with the URL to pass to the connect function
    const serverWithUrl: RegistryServer = {
      ...server,
      remoteUrl: serverUrl.trim(),
      transportType: server.transportType === 'stdio' ? 'streamable-http' : server.transportType,
    };

    const result = await connect(serverWithUrl);

    if (result.success) {
      setPhase('done');
    } else {
      setPhase('error');
      setError(result.error || 'Connection failed. Check the URL and try again.');
    }
  }, [connect, server, serverUrl, isUrlValid, needsUrl]);

  // Auto-close after success
  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        {phase === 'done' ? (
          /* Success */
          <div className="flex flex-col items-center px-6 py-10">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Connected</h2>
            <p className="mt-1 text-center text-xs text-text-secondary">
              {server.name} is now available in your conversations.
              <br />
              Tools will appear automatically when chatting.
            </p>
          </div>
        ) : phase === 'connecting' ? (
          /* Connecting */
          <div className="flex flex-col items-center px-6 py-10">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-tertiary">
              <Loader2 className="h-7 w-7 animate-spin text-text-secondary" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              Connecting to {server.name}...
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Establishing MCP connection and discovering tools
            </p>
          </div>
        ) : phase === 'error' ? (
          /* Error */
          <div className="flex flex-col items-center px-6 py-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Connection Failed</h2>
            <p className="mt-2 max-w-xs text-center text-xs text-text-secondary">{error}</p>
            <div className="mt-5 flex w-full gap-2 px-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border-medium py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                Close
              </button>
              <button
                onClick={() => setPhase('config')}
                className="flex-1 rounded-xl bg-text-primary py-2.5 text-sm font-medium text-surface-primary transition-colors hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* Config / consent screen */
          <>
            {/* Header */}
            <div className="flex flex-col items-center border-b border-border-light px-6 pb-5 pt-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tertiary">
                <Icon className="h-7 w-7 text-text-primary" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">{server.name}</h2>
              <p className="mt-1 text-center text-xs text-text-secondary">
                {needsUrl
                  ? 'Enter the MCP server URL to connect'
                  : 'Connect this service to use it in your conversations'}
              </p>
              {!needsUrl && server.remoteUrl?.includes('smithery.ai') && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-0.5 text-[10px] text-text-tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Hosted by Smithery
                </span>
              )}
            </div>

            <div className="px-6 py-4">
              {/* URL input for servers without a known remote URL */}
              {needsUrl && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    MCP Server URL
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="url"
                      value={serverUrl}
                      onChange={(e) => {
                        setServerUrl(e.target.value);
                        setError('');
                      }}
                      placeholder="https://mcp.example.com/sse"
                      className="w-full rounded-lg border border-border-medium bg-surface-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-heavy focus:outline-none focus:ring-1 focus:ring-border-heavy"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    Supports SSE and Streamable HTTP transports
                  </p>
                </div>
              )}

              {/* Capabilities */}
              <p className="mb-3 text-xs font-medium text-text-secondary">
                This integration can:
              </p>
              <div className="space-y-2.5">
                {toolDescriptions.map((desc) => (
                  <div key={desc} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="h-2.5 w-2.5 text-green-600" />
                    </div>
                    <span className="text-xs text-text-primary">{desc}</span>
                  </div>
                ))}
              </div>

              {/* Security note */}
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-secondary p-2.5">
                <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
                <p className="text-[10px] leading-relaxed text-text-tertiary">
                  Connection is managed server-side. Credentials are encrypted.
                  {server.authType === 'oauth' &&
                    ' OAuth authentication may be required by the service.'}
                </p>
              </div>

              {/* Show remote endpoint for transparency */}
              {!needsUrl && server.remoteUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-2">
                  <Link2 className="h-3 w-3 flex-shrink-0 text-text-tertiary" />
                  <span className="truncate text-[10px] text-text-tertiary font-mono">{server.remoteUrl}</span>
                </div>
              )}

              {error && phase === 'config' && (
                <p className="mt-2 text-xs text-red-500">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-border-light px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border-medium py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={needsUrl && !isUrlValid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-text-primary py-2.5 text-sm font-medium text-surface-primary transition-colors hover:opacity-90 disabled:opacity-40"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Connect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
