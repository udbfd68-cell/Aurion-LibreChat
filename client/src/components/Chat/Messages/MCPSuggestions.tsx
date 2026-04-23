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
  // Google Workspace
  { connectorId: 'google-drive',     keywords: /\b(drive|google drive|exporter|sauvegarder dans le cloud|backup|upload)\b/i },
  { connectorId: 'google-docs',      keywords: /\b(google docs?|document word|exposé|rapport|essai|dissertation|mémoire|rédiger|écrire un (document|texte))\b/i },
  { connectorId: 'google-sheets',    keywords: /\b(tableau|feuille de calcul|excel|spreadsheet|csv|sheet)\b/i },
  { connectorId: 'google-slides',    keywords: /\b(présentation|slides|powerpoint|diapo|pitch deck)\b/i },
  { connectorId: 'google-calendar',  keywords: /\b(calendrier|rendez-vous|meeting|agenda|schedule|planifier)\b/i },
  { connectorId: 'gmail',            keywords: /\b(email|courriel|mail|envoyer.*mail|gmail)\b/i },
  { connectorId: 'google-maps',      keywords: /\b(google maps|itinéraire|adresse|localiser|geocoder|directions)\b/i },
  { connectorId: 'google-search-console', keywords: /\b(search console|seo google|impressions|positionnement google)\b/i },
  { connectorId: 'google-ads',       keywords: /\b(google ads|adwords|campagne google|enchères google)\b/i },
  // Communication / Social
  { connectorId: 'notion',           keywords: /\b(notion|wiki|knowledge base|base de connaissance|page notion)\b/i },
  { connectorId: 'slack',            keywords: /\b(slack|channel|annoncer.*équipe|notifier.*équipe)\b/i },
  { connectorId: 'discord',          keywords: /\b(discord|guild|serveur discord|channel discord)\b/i },
  { connectorId: 'whatsapp',         keywords: /\b(whatsapp|message whatsapp|chatbot whatsapp)\b/i },
  { connectorId: 'microsoft-teams',  keywords: /\b(microsoft teams|ms teams|teams meeting)\b/i },
  { connectorId: 'reddit',           keywords: /\b(reddit|subreddit|r\/[a-z]+)\b/i },
  { connectorId: 'instagram',        keywords: /\b(instagram|insta|ig|stories instagram)\b/i },
  { connectorId: 'linkedin',         keywords: /\b(linkedin|profil pro|connexion pro|poste linkedin|networking)\b/i },
  { connectorId: 'twitter',          keywords: /\b(twitter|x\.com|tweet|thread twitter)\b/i },
  { connectorId: 'youtube',          keywords: /\b(youtube|yt|vidéo youtube|transcript vidéo)\b/i },
  { connectorId: 'spotify',          keywords: /\b(spotify|playlist|musique|podcast|chanson)\b/i },
  { connectorId: 'postpulse',        keywords: /\b(publication multi[- ]plateforme|social media manager|poster sur.*réseaux)\b/i },
  // Dev
  { connectorId: 'github',           keywords: /\b(github|pull request|pr\b|repo\b|repository|issue|commit|star this)\b/i },
  { connectorId: 'gitlab',           keywords: /\b(gitlab|merge request|mr\b|pipeline gitlab)\b/i },
  { connectorId: 'bitbucket',        keywords: /\b(bitbucket|atlassian repo)\b/i },
  { connectorId: 'linear',           keywords: /\b(linear|ticket|bug tracker|backlog|sprint)\b/i },
  { connectorId: 'jira',             keywords: /\b(jira|epic|story|board jira)\b/i },
  { connectorId: 'confluence',       keywords: /\b(confluence|page wiki entreprise|atlassian doc)\b/i },
  { connectorId: 'sentry',           keywords: /\b(sentry|error tracking|stack trace|crash report)\b/i },
  { connectorId: 'datadog',          keywords: /\b(datadog|apm|métriques prod|observabilité)\b/i },
  { connectorId: 'grafana',          keywords: /\b(grafana|dashboard prom|dashboard metrics)\b/i },
  // Search / Web
  { connectorId: 'exa',              keywords: /\b(recherche sémantique|exa|papiers scientifiques|trouver des articles)\b/i },
  { connectorId: 'brave-search',     keywords: /\b(actualités|news|dernières infos|brave search|chercher sur (le |)web)\b/i },
  { connectorId: 'tavily',           keywords: /\b(citations|vérifier|fact[- ]check|sources fiables|tavily)\b/i },
  { connectorId: 'fetch',            keywords: /\b(lire cette page|extraire.*(page|url|site)|fetch url|récupère le contenu)\b/i },
  { connectorId: 'firecrawl',        keywords: /\b(scraper|crawler|firecrawl|extraire un site|données structurées)\b/i },
  { connectorId: 'linkup',           keywords: /\b(linkup|recherche avec citations|source[- ]backed)\b/i },
  { connectorId: 'jina',             keywords: /\b(jina ai|reader api)\b/i },
  { connectorId: 'apify',            keywords: /\b(apify|actor scraper)\b/i },
  { connectorId: 'brightdata',       keywords: /\b(bright data|proxy scraping|bypass block)\b/i },
  // Knowledge / Docs
  { connectorId: 'deepwiki',         keywords: /\b(deepwiki|docs? du repo|documentation github)\b/i },
  { connectorId: 'docfork',          keywords: /\b(docfork)\b/i },
  { connectorId: 'microsoft-learn',  keywords: /\b(microsoft learn|docs microsoft|azure docs)\b/i },
  { connectorId: 'context7',         keywords: /\b(librairie|library docs|exemples de code|api reference|context7)\b/i },
  { connectorId: 'wikipedia',        keywords: /\b(wikipedia|wikipédia|encyclopédie)\b/i },
  { connectorId: 'arxiv',            keywords: /\b(arxiv|papier scientifique|recherche académique|publication académique)\b/i },
  { connectorId: 'obsidian',         keywords: /\b(obsidian|vault|notes locales)\b/i },
  { connectorId: 'memory',           keywords: /\b(mem0|retenir à long terme|mémoire persistante)\b/i },
  // Databases
  { connectorId: 'postgres',         keywords: /\b(postgres|postgresql|bdd sql|requête sql)\b/i },
  { connectorId: 'supabase',         keywords: /\b(supabase|edge function|rls)\b/i },
  { connectorId: 'mongodb',          keywords: /\b(mongo|mongodb|nosql|collection mongo)\b/i },
  { connectorId: 'mysql',            keywords: /\b(mysql|mariadb)\b/i },
  { connectorId: 'redis',            keywords: /\b(redis|cache clé[- ]valeur)\b/i },
  { connectorId: 'qdrant',           keywords: /\b(qdrant|vector db|base vectorielle|embeddings)\b/i },
  { connectorId: 'neon',             keywords: /\b(neon db|neon serverless)\b/i },
  { connectorId: 'bigquery',         keywords: /\b(bigquery|bq\b|data warehouse google)\b/i },
  { connectorId: 'prisma',           keywords: /\b(prisma orm|prisma schema)\b/i },
  // Cloud / IaC
  { connectorId: 'aws',              keywords: /\b(aws|s3|lambda|ec2|dynamodb|cloudformation)\b/i },
  { connectorId: 'cloudflare',       keywords: /\b(cloudflare|workers\b|r2\b|kv\b|d1\b)\b/i },
  { connectorId: 'vercel',           keywords: /\b(vercel|deploy frontend|deployment next)\b/i },
  { connectorId: 'kubernetes',       keywords: /\b(kubernetes|k8s|pod|deployment yaml|helm)\b/i },
  { connectorId: 'terraform',        keywords: /\b(terraform|iac\b|tf plan|tf apply)\b/i },
  { connectorId: 'docker',           keywords: /\b(docker|container|dockerfile|docker[- ]compose)\b/i },
  // Productivity
  { connectorId: 'calendly',         keywords: /\b(calendly|prise de rdv|lien de réservation)\b/i },
  { connectorId: 'dropbox',          keywords: /\b(dropbox)\b/i },
  { connectorId: 'airtable',         keywords: /\b(airtable|base airtable)\b/i },
  { connectorId: 'todoist',          keywords: /\b(todoist|liste de tâches)\b/i },
  { connectorId: 'asana',            keywords: /\b(asana)\b/i },
  { connectorId: 'monday',           keywords: /\b(monday\.com|monday board)\b/i },
  { connectorId: 'clickup',          keywords: /\b(clickup)\b/i },
  { connectorId: 'jotform',          keywords: /\b(jotform)\b/i },
  { connectorId: 'typeform',         keywords: /\b(typeform|form conversationnel)\b/i },
  { connectorId: 'surveymonkey',     keywords: /\b(surveymonkey|sondage)\b/i },
  // Finance
  { connectorId: 'stripe',           keywords: /\b(stripe|paiement en ligne|facture stripe|abonnement saas)\b/i },
  { connectorId: 'paypal',           keywords: /\b(paypal)\b/i },
  { connectorId: 'square',           keywords: /\b(square\b|square payment)\b/i },
  { connectorId: 'quickbooks',       keywords: /\b(quickbooks|compta cloud)\b/i },
  { connectorId: 'xero',             keywords: /\b(xero)\b/i },
  { connectorId: 'freshbooks',       keywords: /\b(freshbooks)\b/i },
  // CRM / Sales
  { connectorId: 'hubspot',          keywords: /\b(hubspot|crm hubspot|marketing automation)\b/i },
  { connectorId: 'salesforce',       keywords: /\b(salesforce|sfdc|lead salesforce)\b/i },
  { connectorId: 'pipedrive',        keywords: /\b(pipedrive|pipeline de vente)\b/i },
  { connectorId: 'close-crm',        keywords: /\b(close\.com|close crm)\b/i },
  { connectorId: 'attio',            keywords: /\b(attio)\b/i },
  { connectorId: 'zoho-crm',         keywords: /\b(zoho crm|zoho)\b/i },
  { connectorId: 'prospector',       keywords: /\b(trouver.*email.*prospect|email finder)\b/i },
  { connectorId: 'lead-gen',         keywords: /\b(génération de leads|lead gen|prospection b2b)\b/i },
  { connectorId: 'sales-intelligence', keywords: /\b(sales intelligence|enrichissement lead)\b/i },
  { connectorId: 'cold-email',       keywords: /\b(cold email|email à froid|séquence outreach)\b/i },
  { connectorId: 'datamerge',        keywords: /\b(datamerge|enrichir profil linkedin)\b/i },
  // Marketing
  { connectorId: 'mailchimp',        keywords: /\b(mailchimp)\b/i },
  { connectorId: 'klaviyo',          keywords: /\b(klaviyo)\b/i },
  { connectorId: 'mailerlite',       keywords: /\b(mailerlite)\b/i },
  { connectorId: 'meta-ads',         keywords: /\b(meta ads|facebook ads|instagram ads|roas)\b/i },
  { connectorId: 'ahrefs',           keywords: /\b(ahrefs|backlinks|audit seo)\b/i },
  // Support
  { connectorId: 'zendesk',          keywords: /\b(zendesk|ticket support)\b/i },
  { connectorId: 'intercom',         keywords: /\b(intercom|chat live|messager site)\b/i },
  { connectorId: 'gorgias',          keywords: /\b(gorgias)\b/i },
  // E-commerce
  { connectorId: 'shopify',          keywords: /\b(shopify|boutique en ligne|produit shopify)\b/i },
  { connectorId: 'wix',              keywords: /\b(wix\b|site wix)\b/i },
  // HR
  { connectorId: 'gusto',            keywords: /\b(gusto|paie|fiche de paie)\b/i },
  { connectorId: 'jobgpt',           keywords: /\b(candidature automatique|recherche d'emploi|cv sur mesure|auto[- ]apply)\b/i },
  // Design / Media
  { connectorId: 'figma',            keywords: /\b(figma|maquette|design ui|prototype figma)\b/i },
  { connectorId: 'canva',            keywords: /\b(canva|création graphique|visuel marketing)\b/i },
  { connectorId: 'tldraw',           keywords: /\b(tldraw|diagramme|wireframe|schéma)\b/i },
  // AI / Models
  { connectorId: 'huggingface',      keywords: /\b(hugging ?face|hf hub|dataset hf)\b/i },
  { connectorId: 'replicate',        keywords: /\b(replicate|générer image ai|modèle replicate)\b/i },
  { connectorId: 'gemini',           keywords: /\b(gemini|veo 3|gemini flash)\b/i },
  // Browser automation
  { connectorId: 'playwright',       keywords: /\b(automatiser.*(navigateur|browser)|playwright|screenshot|tests? e2e)\b/i },
  { connectorId: 'browser-use',      keywords: /\b(browser[- ]use|agent navigateur autonome)\b/i },
  { connectorId: 'puppeteer',        keywords: /\b(puppeteer|chromium headless)\b/i },
  // Utilities
  { connectorId: 'weather',          keywords: /\b(météo|weather|température|prévision)\b/i },
  { connectorId: 'time',             keywords: /\b(timezone|fuseau horaire|heure locale)\b/i },
  { connectorId: 'flight-tracker',   keywords: /\b(vol d'avion|flight|aéroport|tracking vol)\b/i },
  { connectorId: 'zapier',           keywords: /\b(zapier|automatiser workflow|connecter apps)\b/i },
  // Reasoning
  { connectorId: 'sequential-thinking', keywords: /\b(raisonner étape par étape|chain of thought|sequential thinking)\b/i },
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
