# 🚀 Aurion AI - Vercel Deployment Guide

Complete deployment guide for Aurion AI (LibreChat Claude.ai Clone) on Vercel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [External Services Setup](#external-services-setup)
3. [Vercel Project Setup](#vercel-project-setup)
4. [Environment Variables](#environment-variables)
5. [Deploy](#deploy)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Vercel account (free tier works)
- MongoDB Atlas account (free tier available)
- Upstash Redis account (free tier available)
- MeiliSearch Cloud account (free tier available)
- GitHub account (for Vercel integration)
- Domain name (optional, for custom domain)

---

## External Services Setup

### 1. MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with read/write permissions
4. Network Access: Whitelist `0.0.0.0/0` (all IPs) for Vercel
5. Get connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/LibreChat`

### 2. Upstash Redis

1. Go to [Upstash](https://upstash.com)
2. Create a free Redis database
3. Get REST URL and REST Token from the dashboard

### 3. MeiliSearch Cloud

1. Go to [MeiliSearch Cloud](https://www.meilisearch.com/cloud)
2. Create a free project
3. Get the Master Key from the dashboard
4. Note the project URL

### 4. OAuth Applications (Optional but Recommended)

For MCP connectors (Gmail, Drive, Calendar, Linear):

- Follow `setup/oauth-setup-guide.md`
- Create OAuth applications on each platform
- Set redirect URIs to: `https://your-vercel-app.vercel.app/api/mcp/{server}/oauth/callback`

---

## Vercel Project Setup

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Aurion AI Claude.ai Clone"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aurion-librechat.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

### Step 3: Configure Build Settings

Vercel will use the `vercel.json` configuration:

```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "npm install"
}
```

---

## Environment Variables

Add these in Vercel Project Settings → Environment Variables:

### Required Variables

```bash
# Application URL (replace with your Vercel URL)
LIBRECHAT_URL=https://your-app.vercel.app

# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/LibreChat

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port
REDIS_PASSWORD=your-redis-password

# MeiliSearch
MEILI_HOST=https://your-meilisearch-project.meilisearch.com
MEILI_MASTER_KEY=your-meilisearch-master-key

# Security Keys (generate random strings)
JWT_SECRET=your-random-jwt-secret-min-32-chars
CREDS_KEY=your-random-creds-key-min-32-chars
CREDS_IV=your-random-creds-iv-min-16-chars

# Email Service (optional, for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-app.vercel.app

# Session Settings
SESSION_EXPIRY=60000
REFRESH_TOKEN_EXPIRY=300000
```

### LLM Provider Keys

```bash
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxxxx

# OpenRouter (multi-provider)
OPENROUTER_API_KEY=sk-or-xxxxx

# OpenAI (optional)
OPENAI_API_KEY=sk-xxxxx

# Google AI (optional)
GOOGLE_API_KEY=xxxxx
```

### MCP OAuth (Optional)

```bash
# Google OAuth (for Gmail, Drive, Calendar)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Linear OAuth
LINEAR_CLIENT_ID=your-linear-client-id
LINEAR_CLIENT_SECRET=your-linear-client-secret
```

### MCP Service Keys

```bash
# Brave Search (for web search)
BRAVE_API_KEY=your-brave-api-key
```

---

## Deploy

### Automatic Deploy

After pushing to GitHub and importing to Vercel:

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete (~5-10 minutes)
3. Vercel will provide a URL: `https://your-app.vercel.app`

### Manual Deploy from CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Post-Deployment Configuration

### 1. Seed Default Agent

After deployment, seed the default "Claude" agent:

```bash
# Using Vercel CLI
vercel env pull .env.local
npx ts-node setup/seed-agent.ts
```

Or access the application and create agents through the UI.

### 2. Configure LibreChat YAML

Since Vercel uses serverless functions, the `librechat.yaml` needs to be accessible:

1. Upload `setup/librechat-aurion.yaml` to your project root
2. Or configure via Vercel Environment Variables if preferred

### 3. Test MCP Connectors

1. Navigate to your deployed app
2. Go to Settings → MCP Servers
3. Click "Connect" on Gmail, Drive, Calendar, etc.
4. Complete OAuth flow
5. Verify badges appear when typing relevant keywords

### 4. Test OpenRouter Model Names

1. Open the model selector
2. Verify model names are human-readable (e.g., "Claude Opus 4" not "anthropic/claude-opus-4")

### 5. Test MCP Contextual Router

1. Type "Send an email" in chat input
2. Verify Gmail badge appears automatically
3. Type "Check my calendar"
4. Verify Calendar badge appears

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Module not found"

**Solution**: Ensure all dependencies are in `package.json`:
```bash
npm install
```

**Issue**: TypeScript errors during build

**Solution**: Add `skipLibCheck: true` to `tsconfig.json` or fix type errors

### Runtime Errors

**Issue**: "MongoDB connection timeout"

**Solution**: 
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check connection string format
- Ensure cluster is running (not paused)

**Issue**: "Redis connection refused"

**Solution**:
- Verify Upstash Redis URL is correct
- Check Redis is not paused
- Ensure REDIS_PASSWORD is set

**Issue**: "MeiliSearch connection error"

**Solution**:
- Verify MEILI_HOST and MEILI_MASTER_KEY are correct
- Check MeiliSearch project is active

### MCP OAuth Issues

**Issue**: OAuth redirect URI mismatch

**Solution**:
- Ensure redirect URI in OAuth app matches: `https://your-app.vercel.app/api/mcp/{server}/oauth/callback`
- No trailing slashes

**Issue**: OAuth state/CSRF errors

**Solution**:
- Ensure LIBRECHAT_URL is set correctly in environment variables
- Clear browser cookies and retry

### Streaming Issues

**Issue**: Chat streaming not working

**Solution**:
- Vercel serverless functions have 60-second timeout by default
- For long streaming responses, increase `maxDuration` in `vercel.json`:
```json
"maxDuration": 120
```

### Performance Issues

**Issue**: Slow page load

**Solution**:
- Enable Vercel Edge Functions for static assets
- Use Vercel Analytics to identify bottlenecks
- Consider upgrading to paid Vercel plan for more CPU

---

## Custom Domain (Optional)

### Step 1: Add Domain in Vercel

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `aurion.yourdomain.com`)

### Step 2: Update DNS

Vercel will provide DNS records. Add them to your domain registrar:

```
A @ 76.76.21.21
A @ 76.76.19.19
CNAME www cname.vercel-dns.com
```

### Step 3: Update Environment Variables

Update `LIBRECHAT_URL` to your custom domain:
```bash
LIBRECHAT_URL=https://aurion.yourdomain.com
```

### Step 4: Update OAuth Redirect URIs

Update all OAuth applications with new redirect URIs:
```
https://aurion.yourdomain.com/api/mcp/{server}/oauth/callback
```

---

## Monitoring and Logs

### Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Logs" tab
3. Filter by function or status code
4. View real-time logs for debugging

### MongoDB Atlas Monitoring

1. Go to MongoDB Atlas Dashboard
2. Click "Metrics" tab
3. Monitor connection count, operations, performance

### Upstash Redis Monitoring

1. Go to Upstash Dashboard
2. View real-time metrics
3. Monitor memory usage and command statistics

---

## Cost Estimation

### Vercel (Free Tier)
- 100GB bandwidth/month
- 6,000 minutes of build time/month
- Serverless functions: 100GB-hours/month
- **Cost**: $0/month

### MongoDB Atlas (Free Tier)
- 512MB storage
- Shared RAM
- **Cost**: $0/month

### Upstash Redis (Free Tier)
- 10,000 commands/day
- 256MB storage
- **Cost**: $0/month

### MeiliSearch Cloud (Free Tier)
- 1 project
- 5,000 documents
- **Cost**: $0/month

**Total Free Tier Cost**: $0/month

---

## Scaling Considerations

### When to Upgrade

**Vercel Pro ($20/month)**:
- More build minutes
- Faster builds
- Team collaboration
- Edge Functions

**MongoDB Atlas ($9/month)**:
- 10GB storage
- Dedicated RAM
- Better performance

**Upstash Redis ($0.20/100K commands)**:
- More commands
- Better performance

**MeiliSearch ($50/month)**:
- 100,000 documents
- Better search performance

---

## Security Best Practices

1. **Never commit `.env` files** to GitHub
2. **Use Vercel Environment Variables** for all secrets
3. **Rotate API keys** regularly
4. **Enable Vercel Analytics** to monitor traffic
5. **Set up Vercel Alerts** for errors and performance issues
6. **Use HTTPS** (automatic on Vercel)
7. **Implement rate limiting** for API endpoints
8. **Regular backups** of MongoDB data

---

## Support and Documentation

- [LibreChat Documentation](https://docs.librechat.ai)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Upstash Documentation](https://docs.upstash.com)
- [MeiliSearch Documentation](https://docs.meilisearch.com)

---

## Summary

Deployment checklist:

- [ ] External services created (MongoDB, Redis, MeiliSearch)
- [ ] OAuth applications created (optional)
- [ ] Repository pushed to GitHub
- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] Application deployed successfully
- [ ] Default agent seeded
- [ ] MCP connectors tested
- [ ] Model names verified
- [ ] MCP contextual router tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

**Deployment URL**: `https://your-app.vercel.app`
