# PROGRESS — LibreChat · Aurion Edition

État réel de chaque module après la session du 2026-04-22.

## Core deployment

| Module | Fichier | État |
|---|---|---|
| Vercel OOM fix | `vercel.json`, `client/vite.config.ts` | ✅ FIXED — `NODE_OPTIONS=7168`, `minify` conditionnel, glob PWA corrigé |
| Env vars Vercel | `DISABLE_PWA`, `VITE_DISABLE_MINIFY`, `OLLAMA_BASE_URL` | ⚠️ À ajouter via dashboard / API (commandes dans MASTER_BRIEF §5.3) |
| Rewrites | `vercel.json` | ✅ `/api/*` → Render, SPA fallback |
| Orchat serverless | `client/api/orchat.js` | ✅ 100% Ollama, 942 lignes, SSE brut http/https |

## MCP contextual routing

| Module | Fichier | État |
|---|---|---|
| Rules (bilingue FR/EN, accent-insensitive) | `api/server/services/mcp/mcp-routing-rules.js` | ✅ 9 services (Gmail, Drive, Calendar, Linear, GitHub, Slack, Notion, Brave, Filesystem) |
| Routing engine | `api/server/services/mcp/MCPRouter.js` | ✅ `routeText()` + `routeTools()` |
| HTTP routes | `api/server/routes/mcpRouting.js` | ✅ `POST /api/mcp/route` (auth) + `/route/preview` (public) |
| Router registration | `api/server/index.js`, `routes/index.js` | ✅ Enregistré |
| React hook | `client/src/hooks/useMCPRouter.ts` | ✅ Debounce 400 ms, abort in-flight, fallback client-side |
| Badge component | `client/src/components/Chat/Input/MCPContextBadges.tsx` | ✅ Rend 0 quand vide, pills discrètes sinon |
| Legacy IntentBadges | `client/src/components/Chat/Input/IntentBadges.tsx` | ✅ Existait déjà — cohabite avec le nouveau |

## OpenRouter model names

| Module | Fichier | État |
|---|---|---|
| Parser | `client/src/utils/openrouterModelNames.ts` | ✅ 40+ mappings explicites + humanizer fallback. Jamais "custom". |

## Config

| Module | Fichier | État |
|---|---|---|
| `librechat.yaml` | racine | ✅ Interface claude.ai, 3 endpoints (Ollama, OpenRouter `fetch:true`, Anthropic native), modelSpecs élargi, 14 MCP servers |
| `.env.example` | racine | ✅ Existant — voir fichier pour toutes les vars |
| `docker-compose.override.yml` | racine | ✅ Existant — mount yaml, Ollama, SearXNG |
| `setup/oauth-setup-guide.md` | setup/ | ✅ Existant |
| `setup/seed-agent.ts` | setup/ | ✅ Existant |

## Tests

| Module | Fichier | État |
|---|---|---|
| Playwright full spec (10 scénarios + screenshots) | `e2e/specs/librechat-full.spec.ts` | ✅ login, bonjour (0 badges), email→Gmail, fichier→Drive, streaming, model picker, artifact, web-search, console 0 erreur |
| Autres specs existantes | `e2e/specs/aurion-visual.spec.ts`, `connectors.spec.ts`, `chat-extended.spec.ts`, etc. | ✅ |

## Streaming

| Aspect | État |
|---|---|
| SSE headers côté orchat.js | ✅ `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` |
| AbortController côté client | ✅ Le hook `useMCPRouter` abort les requêtes in-flight |
| Nginx buffering | ⚠️ Dépend de l'infra — le header `X-Accel-Buffering: no` règle le cas Nginx |

## Documentation

| Fichier | État |
|---|---|
| `MASTER_BRIEF.md` | ✅ 13 sections, checklist production, commandes copy-paste |
| `PROGRESS.md` | ✅ Ce fichier |
| `CLAUDE.md` | ✅ Existant — architecture & conventions |
| `README.md` | ✅ Existant — complété avec section déploiement Vercel |

## Production checklist

- [x] Build Vercel sans OOM (fix appliqué ; à déployer)
- [ ] `OLLAMA_BASE_URL` configuré sur Vercel pointant vers une instance publique HTTPS
- [ ] Backend Render vivant avec MongoDB + JWT secrets
- [ ] MCP OAuth credentials (Google, Linear, GitHub) configurés si souhaités
- [x] Model picker affiche des noms humains (pas "custom")
- [x] Badges MCP contextuels apparaissent uniquement selon contexte
- [x] Zéro panneau MCP permanent dans l'UI principale
- [x] Tests Playwright end-to-end rédigés

## Dernière mise à jour
2026-04-22 — Session "MISSION ABSOLUE"
