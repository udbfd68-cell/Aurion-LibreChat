# CLAUDE-ARCHITECTURE.md — LibreChat Claude.ai Clone
Dernière mise à jour : 2026-04-21 12:42 UTC+02

## Architecture en une phrase

LibreChat configuré avec des MCP servers statiques (niveau App) via OAuth pour offrir une expérience zero-config identique à claude.ai, avec des outils d'agent (web search, code execution, artifacts) pré-configurés.

## Composants et leur responsabilité

### 1. Client Vercel (Frontend)
- **Responsabilité** : Interface React/TypeScript, streaming SSE, gestion des états UI
- **Ce qu'il fait** : Affiche les messages, gère les interactions, envoie les requêtes API
- **Ce qu'il ne fait PAS** : Exécute du code, accède aux APIs externes directement, stocke des données

### 2. API Client (Vercel Edge Functions)
- **Responsabilité** : Proxy API léger pour config, endpoints, et streaming chat
- **Ce qu'il fait** : 
  - config.js : Retourne la configuration LibreChat (endpoints, interface settings)
  - endpoints.js : Liste des modèles disponibles (OpenRouter)
  - orchat.js : Handler de streaming chat vers OpenRouter API avec fallback vers Render
  - misc.js : Handlers pour divers endpoints (roles, prompts, keys, tool-auth)
- **Ce qu'il ne fait PAS** : Stocke des données, gère l'auth, exécute des MCP servers

### 3. Backend LibreChat (Docker/Render)
- **Responsabilité** : API complète LibreChat (auth, agents, MCP, database)
- **Ce qu'il fait** :
  - Gestion des utilisateurs et sessions
  - Stockage des conversations et messages
  - Exécution des agents avec tools
  - Gestion des MCP servers (OAuth, connections)
  - Base de données MongoDB
- **Ce qu'il ne fait PAS** : Affichage UI (c'est le frontend)

### 4. MCP Servers (Connecteurs)
- **Responsabilité** : Fournir des outils pour accéder aux services externes
- **Ce qu'il fait** :
  - Gmail : Lire, envoyer, rechercher des emails
  - Google Drive : Gérer les fichiers
  - Google Calendar : Gérer les événements
  - Linear : Gérer les issues et projets
  - GitHub : Accéder aux repos et PRs
- **Ce qu'il ne fait PAS** : Stocker des données utilisateur (passe par OAuth)

### 5. Outils d'Agent
- **Responsabilité** : Exécuter des actions spécifiques pour l'agent
- **Ce qu'il fait** :
  - Web Search : DuckDuckGo Instant Answer API + Brave Search
  - Code Execution : Wandbox API (Python, JS, Java, C++, etc.)
  - Browser : HTTP fetch + HTML parsing
  - File Search : RAG sur les documents uploadés
- **Ce qu'il ne fait PAS** : Prendre de décisions autonomes (c'est l'agent)

## Décisions techniques

| Décision | Alternative rejetée | Raison |
|----------|--------------------|--------|
| MCP servers pré-configurés dans librechat.yaml | Demander URLs à l'utilisateur | Zero-config pour l'utilisateur final (comme claude.ai) |
| OAuth pour Google/Linear | API keys statiques | Sécurité, gestion des tokens utilisateur, révocabilité |
| DuckDuckGo Instant Answer API en priorité | Brave Search uniquement | Plus fiable, moins de CAPTCHA, API structurée |
| Wandbox pour code execution | E2B ou LibreChat Code Interpreter | Gratuit, pas de clé API requise, fonctionne depuis Vercel |
| Configuration dans setup/ (pas racine) | Directement dans librechat.yaml | Évite les conflits gitignore, versionne la config template |
| Streaming simplifié (pas de parsing tags) | State machine complexe pour  | Plus simple, plus rapide, moins de bugs |

## Pièges connus

1. **Gitignore bloque setup/** : Les fichiers dans setup/ sont protégés par .gitignore. Pour déployer, copier manuellement les fichiers vers le backend.
2. **OAuth nécessite HTTPS** : Les callbacks OAuth ne fonctionnent qu'avec HTTPS. Pour le dev local, utiliser ngrok ou similaire.
3. **MCP endpoints retournent 405 sur GET** : C'est normal — ils attendent des requêtes POST JSON-RPC.
4. **Web search peut être bloqué par CAPTCHA** : DuckDuckGo Instant Answer API est plus fiable que le scraping HTML.
5. **Configuration doit être montée dans Docker** : librechat.yaml doit être monté comme volume dans le conteneur backend.

## Pour reprendre ce projet

1. Lire PROGRESS.md pour l'état actuel
2. Copier setup/librechat-aurion.yaml vers librechat.yaml dans le backend
3. Copier setup/.env.example vers .env et configurer les variables
4. Copier setup/docker-compose-aurion.yml vers docker-compose.override.yml (optionnel)
5. Suivre setup/README-DEPLOYMENT.md pour le déploiement
6. Suivre setup/oauth-setup-guide.md pour la configuration OAuth
7. Exécuter `npx ts-node setup/seed-agent.ts` pour créer l'agent Claude par défaut
