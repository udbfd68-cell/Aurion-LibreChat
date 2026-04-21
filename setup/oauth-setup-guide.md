# 🔐 Guide de Configuration OAuth

Ce guide vous accompagne dans la configuration des applications OAuth nécessaires pour les connecteurs MCP de LibreChat.

## Table des Matières

1. [Google (Gmail, Drive, Calendar)](#google-gmail-drive-calendar)
2. [Linear](#linear)
3. [GitHub](#github)
4. [Slack](#slack)
5. [Notion](#notion)
6. [Composio (Alternative hébergée)](#composio-alternative-hébergée)

---

## Google (Gmail, Drive, Calendar)

### Option A: Via Composio (Recommandé pour démarrer rapidement)

Composio fournit des MCP servers hébergés qui gèrent l'OAuth pour vous:

1. Créez un compte sur [composio.dev](https://composio.dev)
2. Ajoutez les intégrations Gmail, Drive, Calendar
3. Copiez les URLs MCP dans votre `.env`:
   ```bash
   COMPOSIO_API_KEY=your-api-key
   COMPOSIO_GMAIL_MCP_URL=https://mcp.composio.dev/gmail/your-endpoint
   COMPOSIO_DRIVE_MCP_URL=https://mcp.composio.dev/googledrive/your-endpoint
   COMPOSIO_CALENDAR_MCP_URL=https://mcp.composio.dev/googlecalendar/your-endpoint
   ```

### Option B: Via Google Cloud Console (Self-hosted)

Si vous préférez héberger votre propre MCP server:

#### Étape 1: Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Cliquez sur **Sélectionner un projet** > **Nouveau projet**
3. Nommez-le `LibreChat-MCP` et créez

#### Étape 2: Activer les APIs

Dans **APIs et services** > **Bibliothèque**, activez:
- Gmail API
- Google Drive API
- Google Calendar API
- Google Sheets API

#### Étape 3: Configurer l'écran de consentement OAuth

1. Allez dans **APIs et services** > **Écran de consentement OAuth**
2. Choisissez **Externe** (ou Interne si Google Workspace)
3. Remplissez:
   - Nom de l'application: `LibreChat`
   - Email d'assistance utilisateur: votre email
   - Logo (optionnel)
4. **Scopes**: Ajoutez:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/spreadsheets.readonly
   https://www.googleapis.com/auth/spreadsheets
   ```
5. **Utilisateurs test**: Ajoutez les emails des testeurs

#### Étape 4: Créer les identifiants OAuth

1. Allez dans **APIs et services** > **Identifiants**
2. **Créer des identifiants** > **ID client OAuth**
3. Type: **Application Web**
4. Nom: `LibreChat MCP`
5. **URIs de redirection autorisés**:
   ```
   https://votre-domaine.com/api/mcp/gmail/oauth/callback
   https://votre-domaine.com/api/mcp/google-drive/oauth/callback
   https://votre-domaine.com/api/mcp/google-calendar/oauth/callback
   ```
6. Copiez **Client ID** et **Client Secret**

#### Étape 5: Configurer dans .env

```bash
GOOGLE_MCP_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_MCP_CLIENT_SECRET=GOCSPX-xxx
```

---

## Linear

Linear a un MCP server officiel: `https://mcp.linear.app/mcp`

### Étape 1: Créer une application OAuth

1. Allez sur [linear.app/settings/api](https://linear.app/settings/api)
2. Cliquez sur **OAuth Applications** > **New OAuth Application**
3. Remplissez:
   - Nom: `LibreChat`
   - Description: `LibreChat MCP Integration`
   - Redirect URIs:
     ```
     https://votre-domaine.com/api/mcp/linear/oauth/callback
     ```
4. Copiez **Client ID** et **Client Secret**

### Étape 2: Configurer dans .env

```bash
LINEAR_CLIENT_ID=xxx
LINEAR_CLIENT_SECRET=xxx
```

### Scopes Linear

Les scopes sont configurés dans `librechat.yaml`:
- `read`: Lecture des issues, projets, teams
- `write`: Création/modification d'issues

---

## GitHub

Deux options pour GitHub:

### Option A: Personal Access Token (Plus simple)

1. Allez sur [github.com/settings/tokens](https://github.com/settings/tokens)
2. **Generate new token (classic)**
3. Scopes requis:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org membership)
4. L'utilisateur entre son PAT dans LibreChat quand il connecte GitHub

### Option B: OAuth App (Meilleure UX)

1. Allez sur [github.com/settings/developers](https://github.com/settings/developers)
2. **OAuth Apps** > **New OAuth App**
3. Remplissez:
   - Application name: `LibreChat`
   - Homepage URL: `https://votre-domaine.com`
   - Authorization callback URL:
     ```
     https://votre-domaine.com/api/mcp/github/oauth/callback
     ```
4. Copiez **Client ID** et **Client Secret**

### Configurer dans .env

```bash
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

---

## Slack

### Étape 1: Créer une application Slack

1. Allez sur [api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App** > **From scratch**
3. Nom: `LibreChat`, Workspace: choisissez le vôtre

### Étape 2: Configurer OAuth & Permissions

1. Dans **OAuth & Permissions** > **Redirect URLs**, ajoutez:
   ```
   https://votre-domaine.com/api/mcp/slack/oauth/callback
   ```

2. Ajoutez les **Bot Token Scopes**:
   ```
   channels:history
   channels:read
   chat:write
   groups:history
   groups:read
   im:history
   im:read
   mpim:history
   mpim:read
   users:read
   ```

### Étape 3: Récupérer les credentials

Dans **Basic Information**:
- Client ID
- Client Secret

### Configurer dans .env

```bash
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
```

---

## Notion

### Étape 1: Créer une intégration

1. Allez sur [developers.notion.com](https://developers.notion.com)
2. **My Integrations** > **Create new integration**
3. Remplissez:
   - Name: `LibreChat`
   - Logo (optionnel)
   - Associated workspace

### Étape 2: Configurer OAuth

1. Dans les settings de l'intégration, activez **Public integration**
2. **OAuth Domain & URIs**:
   - Redirect URI:
     ```
     https://votre-domaine.com/api/mcp/notion/oauth/callback
     ```

3. **Capabilities** (permissions):
   - Read content
   - Update content
   - Insert content
   - Read user information

### Étape 3: Récupérer les credentials

- OAuth client ID
- OAuth client secret

### Configurer dans .env

```bash
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx
```

---

## Composio (Alternative hébergée)

[Composio](https://composio.dev) est une plateforme qui héberge des MCP servers pré-configurés pour de nombreux services. C'est l'option la plus simple pour démarrer.

### Avantages

- ✅ Pas de configuration OAuth complexe
- ✅ Support pour 200+ intégrations
- ✅ UI de gestion des connexions
- ✅ Webhooks et triggers

### Configuration

1. Créez un compte sur [composio.dev](https://composio.dev)
2. Ajoutez les intégrations souhaitées (Gmail, Slack, Notion...)
3. Pour chaque intégration, récupérez l'URL MCP
4. Ajoutez dans `.env`:

```bash
COMPOSIO_API_KEY=your-api-key

# URLs MCP
COMPOSIO_GMAIL_MCP_URL=https://mcp.composio.dev/gmail/xxx
COMPOSIO_DRIVE_MCP_URL=https://mcp.composio.dev/googledrive/xxx
COMPOSIO_CALENDAR_MCP_URL=https://mcp.composio.dev/googlecalendar/xxx
COMPOSIO_SLACK_MCP_URL=https://mcp.composio.dev/slack/xxx
COMPOSIO_NOTION_MCP_URL=https://mcp.composio.dev/notion/xxx
```

---

## Vérification

Après configuration, vérifiez que tout fonctionne:

1. Démarrez LibreChat: `docker compose up -d`
2. Allez dans l'interface, panneau MCP
3. Cliquez sur **Connect** pour chaque service
4. Complétez le flow OAuth
5. Testez un tool (ex: "Search my emails about project X")

## Troubleshooting

### Erreur "redirect_uri_mismatch"

L'URI de callback dans l'app OAuth ne correspond pas à celle configurée. Vérifiez:
- Le format exact de `LIBRECHAT_URL` dans `.env`
- Les URIs dans chaque app OAuth

### Erreur "invalid_scope"

Les scopes demandés ne sont pas autorisés. Vérifiez:
- Que les APIs sont activées (Google)
- Que les scopes sont configurés dans l'app OAuth

### Erreur "access_denied"

L'utilisateur a refusé l'accès ou n'est pas dans la liste des testeurs (Google en mode test).

---

## Prochaines étapes

1. [Configuration des agents](../README.md#agents)
2. [Personnalisation de l'interface](../README.md#interface)
3. [Déploiement en production](../README.md#deployment)
