# 🚀 Aurion AI — LibreChat Claude.ai Clone
## Deployment Guide

This guide explains how to deploy Aurion AI (LibreChat configured as a Claude.ai clone) with all MCP connectors, OAuth, and agent capabilities.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Configuration](#configuration)
4. [OAuth Setup](#oauth-setup)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker and Docker Compose installed
- MongoDB instance (local or cloud)
- Redis instance (for queue/caching)
- Node.js 18+ (if running without Docker)
- Domain name with SSL (for production OAuth)

---

## Quick Start (Docker)

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/aurion-librechat.git
cd aurion-librechat
```

### Step 2: Copy Configuration Files

```bash
# Copy LibreChat configuration
cp setup/librechat-aurion.yaml librechat.yaml

# Copy environment variables template
cp setup/.env.example .env

# Copy Docker Compose override (optional, for additional services)
cp setup/docker-compose-aurion.yml docker-compose.override.yml
```

### Step 3: Configure Environment Variables

Edit `.env` and set the required variables:

```bash
# Required for basic operation
LIBRECHAT_URL=https://your-domain.com
MONGO_URI=mongodb://localhost:27017/LibreChat
MEILI_MASTER_KEY=your-meilisearch-key
JWT_SECRET=your-jwt-secret
CREDS_KEY=your-creds-key
CREDS_IV=your-creds-iv

# Required for LLM providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
OPENROUTER_API_KEY=sk-or-xxx
```

### Step 4: Start Services

```bash
docker compose up -d
```

This will start:
- LibreChat API and frontend
- MongoDB
- MeiliSearch
- Redis
- Sandpack Bundler (for artifacts)
- SearXNG (for web search)
- Ollama (for local LLMs, optional)
- Firecrawl (for web scraping, optional)

### Step 5: Seed Default Agent

```bash
docker compose exec api npm run seed-agent
```

Or run the seed script directly:

```bash
npx ts-node setup/seed-agent.ts
```

This creates the default "Claude" agent with all capabilities enabled.

### Step 6: Access the Application

Open your browser and navigate to:
- Frontend: `http://localhost:3000`
- API: `http://localhost:3080`

---

## Configuration

### LibreChat Configuration (`librechat.yaml`)

The `setup/librechat-aurion.yaml` file contains the complete configuration for:

- **MCP Servers**: Gmail, Drive, Calendar, Linear, GitHub, etc.
- **OAuth Configuration**: Pre-configured for all services
- **Agent Settings**: Artifacts, code interpreter, file search enabled
- **LLM Endpoints**: Anthropic, OpenAI, OpenRouter
- **Actions Domain Restrictions**: SSRF protection

Copy this file to your backend root as `librechat.yaml`.

### Environment Variables (`.env`)

See `setup/.env.example` for the complete list of environment variables.

**Required for basic operation:**
- `LIBRECHAT_URL` - Your domain (for OAuth callbacks)
- `MONGO_URI` - MongoDB connection string
- `MEILI_MASTER_KEY` - MeiliSearch master key
- `JWT_SECRET` - JWT secret for authentication
- `CREDS_KEY` / `CREDS_IV` - Encryption keys

**Required for LLM providers:**
- `ANTHROPIC_API_KEY` - For Claude models
- `OPENAI_API_KEY` - For GPT models
- `OPENROUTER_API_KEY` - For multi-provider access

**Required for OAuth:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google services
- `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET` - For Linear

**Optional for additional features:**
- `TAVILY_API_KEY` - For web search
- `E2B_API_KEY` - For code interpreter
- `BRAVE_API_KEY` - For Brave Search MCP server

---

## OAuth Setup

### Google (Gmail, Drive, Calendar)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs: Gmail API, Google Drive API, Google Calendar API
4. Go to APIs & Services → OAuth consent screen
5. Configure as "External" or "Internal" (for Google Workspace)
6. Add scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/calendar`
7. Create OAuth 2.0 Client ID (Web application)
8. Add redirect URIs:
   - `https://your-domain.com/api/mcp/gmail/oauth/callback`
   - `https://your-domain.com/api/mcp/google-drive/oauth/callback`
   - `https://your-domain.com/api/mcp/google-calendar/oauth/callback`
9. Copy Client ID and Client Secret to `.env`

### Linear

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Create new OAuth Application
3. Set callback URL: `https://your-domain.com/api/mcp/linear/oauth/callback`
4. Copy Client ID and Client Secret to `.env`

### GitHub

Two options:

**Option 1: Personal Access Token (Simpler)**
- Users enter their PAT when connecting GitHub
- No OAuth setup required

**Option 2: OAuth App (Better UX)**
- Create OAuth App at GitHub settings
- Set callback URL: `https://your-domain.com/api/mcp/github/oauth/callback`
- Copy Client ID and Client Secret to `.env`

**Detailed instructions**: See `setup/oauth-setup-guide.md`

---

## Production Deployment

### Option 1: Docker (Self-hosted)

#### Using Docker Compose

```bash
# Copy configuration
cp setup/librechat-aurion.yaml librechat.yaml
cp setup/.env.example .env

# Configure environment variables for production
nano .env

# Start all services
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

#### Using Docker Swarm or Kubernetes

Convert the Docker Compose configuration to Swarm or Kubernetes manifests.

### Option 2: Render (Cloud)

1. Fork the LibreChat repository
2. Connect to Render
3. Configure environment variables
4. Upload `librechat.yaml` as a configuration file
5. Deploy

**Important**: Set `CONFIG_PATH=/app/librechat.yaml` in environment variables.

### Option 3: Vercel (Frontend) + Render (Backend)

The current setup uses:
- **Vercel**: Frontend (client) and edge functions
- **Render**: Backend API and MongoDB

To deploy:

1. **Frontend (Vercel)**:
   ```bash
   cd client
   npx vercel deploy --prod
   ```

2. **Backend (Render)**:
   - Create a new Web Service on Render
   - Set environment variables
   - Upload `librechat.yaml` to the repository
   - Deploy

### SSL/TLS Configuration

For OAuth to work, you must have HTTPS enabled:
- Use Let's Encrypt (free) with Certbot
- Use Cloudflare SSL (free)
- Use your cloud provider's managed SSL

### Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

## Troubleshooting

### OAuth Callback Errors

**Error: `redirect_uri_mismatch`**
- Verify `LIBRECHAT_URL` in `.env` matches exactly (no trailing slash)
- Verify redirect URIs in OAuth app match exactly
- Check for HTTP vs HTTPS mismatch

**Error: `invalid_scope`**
- Verify APIs are enabled in Google Cloud Console
- Verify scopes are configured in OAuth consent screen

### MCP Connection Errors

**Error: `Connection refused`**
- Verify MCP server URL is correct
- Check if service is running (for stdio servers)
- Verify firewall allows connections

**Error: `Unauthorized`**
- Verify OAuth credentials are correct
- Check if OAuth token is expired
- Re-authorize the MCP connection

### Database Connection Errors

**Error: `MongoNetworkError`**
- Verify MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify network connectivity

### Agent Not Showing

**Error: Agent not visible in UI**
- Run `npm run seed-agent` to create default agent
- Check MongoDB for agent document
- Verify agent has `isPublic: true`

### Services Not Starting

**Error: Container exits immediately**
- Check logs: `docker compose logs <service>`
- Verify environment variables are set
- Check for port conflicts

---

## Performance Tuning

### MongoDB

```yaml
# docker-compose.yml
mongodb:
  image: mongo:7
  command: mongod --wiredTigerCacheSizeGB 4
  deploy:
    resources:
      limits:
        memory: 8G
```

### Redis

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### LibreChat API

```yaml
api:
  environment:
    - NODE_ENV=production
    - NODE_OPTIONS=--max-old-space-size=4096
```

---

## Monitoring

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f api

# View last 100 lines
docker compose logs --tail=100
```

### Health Checks

LibreChat provides health endpoints:
- `GET /api/health` - API health
- `GET /api/health/db` - Database health
- `GET /api/health/cache` - Cache health

### Metrics

Enable metrics collection in `.env`:
```bash
METRICS_ENABLED=true
METRICS_PORT=9090
```

---

## Backup

### MongoDB Backup

```bash
# Backup
docker compose exec mongodb mongodump --archive=/backup/mongodb-$(date +%Y%m%d).archive

# Restore
docker compose exec mongodb mongorestore --archive=/backup/mongodb-20240421.archive
```

### Configuration Backup

```bash
# Backup configuration files
tar -czf librechat-config-backup-$(date +%Y%m%d).tar.gz librechat.yaml .env
```

---

## Security

### Recommended Security Practices

1. **Use strong secrets** for JWT, encryption keys, and API keys
2. **Enable rate limiting** in `librechat.yaml`
3. **Configure allowed domains** for actions (SSRF protection)
4. **Use HTTPS** with valid SSL certificate
5. **Regular updates** of Docker images and dependencies
6. **Limit container privileges** (run as non-root user)
7. **Network isolation** (use Docker networks)
8. **Regular backups** of database and configuration

### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH
ufw deny 3080/tcp  # API (internal only)
ufw deny 27017/tcp # MongoDB (internal only)
```

---

## Support

For issues and questions:
- Documentation: https://www.librechat.ai/docs
- GitHub Issues: https://github.com/danny-avila/LibreChat/issues
- Community Discord: [Link]

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

**Made with ❤️ by Aurion Studio**
