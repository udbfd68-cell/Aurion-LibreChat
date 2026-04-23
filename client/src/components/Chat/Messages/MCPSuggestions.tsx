/**
 * MCPSuggestions — Contextual MCP connector suggestions shown below the last
 * assistant message (claude.ai-style "Would you like to export this to Drive?").
 *
 * How it works:
 *   1. A small keyword → connector map infers up to 3 relevant MCPs from the
 *      message text (user prompt + assistant reply).
 *   2. Already-connected connectors are filtered out.
 *   3. Clicking a chip calls `connect(server)`:
 *        - No-auth connectors: activate instantly.
 *        - OAuth connectors: triggers the normal OAuth flow via the backend.
 *
 * No LLM call required — rule-based so it's free, instant, and predictable.
 */
import { useMemo } from 'react';
import { Sparkles, Plug2, Check } from 'lucide-react';
import { useMCPConnectors } from '~/components/Connectors/useMCPConnectors';
import { MCP_SERVERS, type RegistryServer } from '~/components/Connectors/registryData';
import { getIcon } from '~/components/Connectors/iconMap';

interface Rule {
  connectorId: string;
  keywords: RegExp;
}

const RULES: Rule[] = [
  { connectorId: 'google-drive',     keywords: /\b(drive|google drive|exporter|sauvegarder dans le cloud|backup|upload)\b/i },
  { connectorId: 'google-docs',      keywords: /\b(google docs?|document word|exposé|rapport|essai|dissertation|mémoire|rédiger|écrire un (document|texte))\b/i },
  { connectorId: 'google-sheets',    keywords: /\b(tableau|feuille de calcul|excel|spreadsheet|csv|sheet)\b/i },
  { connectorId: 'google-slides',    keywords: /\b(présentation|slides|powerpoint|diapo|pitch deck)\b/i },
  { connectorId: 'google-calendar',  keywords: /\b(calendrier|rendez-vous|meeting|agenda|schedule|planifier)\b/i },
  { connectorId: 'gmail',            keywords: /\b(email|courriel|mail|envoyer.*mail|gmail)\b/i },
  { connectorId: 'notion',           keywords: /\b(notion|wiki|knowledge base|base de connaissance|page notion)\b/i },
  { connectorId: 'slack',            keywords: /\b(slack|channel|équipe|annoncer|notifier l'équipe)\b/i },
  { connectorId: 'github',           keywords: /\b(github|pull request|pr|repo|repository|issue|commit)\b/i },
  { connectorId: 'linear',           keywords: /\b(linear|ticket|bug tracker|backlog|sprint)\b/i },
  { connectorId: 'exa',              keywords: /\b(recherche web|web search|sources|papiers|études|articles)\b/i },
  { connectorId: 'brave-search',     keywords: /\b(actualités|news|dernières infos|chercher sur (le |)web)\b/i },
  { connectorId: 'tavily',           keywords: /\b(citations|vérifier|fact[- ]check|sources fiables)\b/i },
  { connectorId: 'fetch',            keywords: /\b(lire cette page|extraire.*(page|url|site)|scrape|fetch url)\b/i },
  { connectorId: 'firecrawl',        keywords: /\b(scraper|crawler|extraire un site|données structurées)\b/i },
  { connectorId: 'deepwiki',         keywords: /\b(documentation|deepwiki|docs? du repo)\b/i },
  { connectorId: 'context7',         keywords: /\b(librairie|library docs|exemples de code|api reference)\b/i },
  { connectorId: 'postgres',         keywords: /\b(postgres|postgresql|sql|database|bdd)\b/i },
  { connectorId: 'supabase',         keywords: /\b(supabase|auth|storage|edge function)\b/i },
  { connectorId: 'stripe',           keywords: /\b(stripe|paiement|facture|invoice|abonnement|subscription)\b/i },
  { connectorId: 'memory',           keywords: /\b(retenir|mémoriser|se souvenir|sauvegarder cette info)\b/i },
  { connectorId: 'wikipedia',        keywords: /\b(wikipedia|wikipédia|encyclopédie)\b/i },
  { connectorId: 'arxiv',            keywords: /\b(arxiv|papier scientifique|recherche académique|publication)\b/i },
  { connectorId: 'playwright',       keywords: /\b(automatiser.*(navigateur|browser)|screenshot|tests? e2e)\b/i },
];

const MAX_SUGGESTIONS = 3;

function pickSuggestions(text: string, isConnected: (id: string) => boolean): RegistryServer[] {
  if (!text || text.length < 20) {
    return [];
  }
  const seen = new Set<string>();
  const picks: RegistryServer[] = [];
  for (const rule of RULES) {
    if (picks.length >= MAX_SUGGESTIONS) {
      break;
    }
    if (seen.has(rule.connectorId)) {
      continue;
    }
    if (!rule.keywords.test(text)) {
      continue;
    }
    if (isConnected(rule.connectorId)) {
      continue;
    }
    const server = MCP_SERVERS.find((s) => s.id === rule.connectorId);
    if (!server || !server.remoteUrl) {
      continue;
    }
    seen.add(rule.connectorId);
    picks.push(server);
  }
  return picks;
}

export interface MCPSuggestionsProps {
  messageText: string;
  /** Optional prior user prompt to widen keyword matching. */
  promptText?: string;
}

export default function MCPSuggestions({ messageText, promptText }: MCPSuggestionsProps) {
  const { isConnected, connect, isConnecting } = useMCPConnectors();

  const combined = useMemo(
    () => `${promptText ?? ''}\n${messageText ?? ''}`,
    [promptText, messageText],
  );

  const suggestions = useMemo(
    () => pickSuggestions(combined, isConnected),
    [combined, isConnected],
  );

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-light pt-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
        <Sparkles className="h-3.5 w-3.5" />
        Suggested integrations
      </span>
      {suggestions.map((server) => {
        const Icon = getIcon(server.icon);
        const needsAuth = !!server.authType || !!server.oauth;
        return (
          <button
            key={server.id}
            type="button"
            disabled={isConnecting}
            onClick={() => {
              void connect(server);
            }}
            className="group flex items-center gap-1.5 rounded-full border border-border-medium bg-surface-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-heavy hover:bg-surface-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            title={server.description}
            aria-label={`Connect ${server.name}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{server.name}</span>
            {needsAuth ? (
              <Plug2 className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            ) : (
              <Check className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        );
      })}
    </div>
  );
}
