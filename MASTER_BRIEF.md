# MASTER BRIEF — LibreChat Aurion · Production-Ready Deployment
> Généré le 2026-04-22. Ce fichier est le brief exhaustif pour amener le projet à 100% production.
> Lis tout en entier avant de toucher une seule ligne. Exécute tout d'un coup. Zéro workaround.

---

## 1. CONTEXTE PROJET

**Repo GitHub :** `https://github.com/udbfd68-cell/Aurion-LibreChat.git` · branche `master`  
**Vercel Team :** `team_C2vaCqL89CLCvwK17DSw6SoY`  
**Vercel Project ID :** `prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP` · nom `client`  
**Token Vercel :** `vca_8ilzluOZDTbB867DbdYEn8FAf72bGnZovJK2NN5sMkNmcmaKTB15DIvr` (expire 1776829191)  
**URL production attendue :** `https://client-aurion1.vercel.app`  
**Stack :** React/Vite frontend (`client/`) + Node.js/Express backend (`api/`) + monorepo npm workspaces  
**Objectif :** LibreChat 100% Ollama/gemma4, UI clone de Claude.ai, déployé sur Vercel, production-ready.

---

## 2. CE QUI A ÉTÉ FAIT (NE PAS REFAIRE)

- [x] `client/api/orchat.js` — migré 100% Ollama, zéro OpenRouter/Anthropic/Groq. 942 lignes. Fonctionne.
- [x] `librechat.yaml` — endpoint Ollama uniquement, `modelSpecs.enforce: true`, gemma4 par défaut.
- [x] `client/api/models.js` — `OPENROUTER_MODELS = ['gemma4']`
- [x] `vercel.json` (racine) — `buildCommand: "cd client && NODE_OPTIONS=... npm run build"`, `outputDirectory: "client/dist"`, `installCommand: "npm install --legacy-peer-deps"`
- [x] `.vercel/project.json` (racine) — pointé sur `prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP`
- [x] Git commits : `418fa72` (Ollama), `e825ca8` (vercel.json), `d65fc51` (root deploy)
- [x] Features précédentes : noms modèles OpenRouter, MCP UI masqué, badges intent detection, SSE streaming fix, Playwright visual tests

---

## 3. PROBLÈME BLOQUANT ACTUEL — OOM SUR VERCEL

### Symptôme
```
● At least one "Out of Memory" ("OOM") event was detected during the build.
  ● SIGKILL — build container terminates a process.
```

### Cause racine
Vite 7 transforme **8164 modules** + génère des chunks massifs :
```
dist/assets/vendor.DhS-1qvX.js     → 6,774 kB (gzip: 1,910 kB)   ← MONSTRE
dist/assets/locales.BnlQL00i.js    → 2,530 kB (gzip:   742 kB)
dist/assets/heic-converter.js      → 2,186 kB (gzip:   547 kB)
dist/assets/index.CWKgZP3w.js      → 1,806 kB (gzip:   509 kB)
dist/assets/mermaid.C6NJtJKi.js    → 1,680 kB (gzip:   418 kB)
```
Vercel Pro = 8GB RAM. Vite + esbuild minify + rollup manualChunks sur 8164 modules = OOM systématique.

### Solutions à appliquer (ordre de priorité)

#### SOLUTION A — Désactiver minification esbuild (le plus gros mangeur de RAM)
Dans `client/vite.config.ts`, changer `minify: 'esbuild'` → `minify: false` **uniquement pour le build Vercel**.  
Ou : passer à `minify: 'terser'` avec `terserOptions: { compress: false, mangle: true }` (moins de RAM).

**La vraie fix :** Ajouter env var `VITE_DISABLE_MINIFY=true` sur Vercel, et dans `vite.config.ts` :
```ts
minify: process.env.VITE_DISABLE_MINIFY === 'true' ? false : 'esbuild',
```

#### SOLUTION B — Désactiver PWA sur Vercel (économise ~300MB RAM workbox precache)
```ts
...(process.env.DISABLE_PWA === 'true' ? [] : [VitePWA({...})])
```
Ce code existe déjà ! Ajouter `DISABLE_PWA=true` comme env var Vercel.

#### SOLUTION C — NODE_OPTIONS upgrade dans vercel.json
Changer de `4096` à `7168` (proche max 8GB) :
```json
"buildCommand": "cd client && NODE_OPTIONS=--max-old-space-size=7168 npm run build"
```

#### SOLUTION D (backup) — Utiliser `bun` à la place de `npm run build`
Le script `b:build` utilise Bun qui est ~3x plus rapide/économe en mémoire.  
```json
"buildCommand": "cd client && NODE_OPTIONS=--max-old-space-size=7168 bunx --bun vite build && node ./scripts/post-build.cjs"
```

#### ⭐ SOLUTION RECOMMANDÉE (combiner A + B + C) :
1. Modifier `client/vite.config.ts` : `minify: process.env.VITE_DISABLE_MINIFY === 'true' ? false : 'esbuild'`
2. Modifier `vercel.json` racine : `NODE_OPTIONS=--max-old-space-size=7168`
3. Ajouter env vars Vercel : `DISABLE_PWA=true` + `VITE_DISABLE_MINIFY=true`
4. Redéployer

---

## 4. TOUTES LES ERREURS / WARNINGS À CORRIGER

### 4.1 Build Warnings (non-bloquants mais à nettoyer)

```
⚠ Circular chunk: http-client -> vendor -> http-client
```
**Fix :** Dans `vite.config.ts` `manualChunks`, ajouter une règle explicite pour `http-client` :
```ts
if (normalizedId.includes('http-client')) return 'http-client';
```

```
⚠ eval in vm-browserify/index.js — security risk
```
**Fix :** Dans `vite.config.ts` `rollupOptions`, ajouter :
```ts
output: { exports: 'named' }
```
Et exclure `vm-browserify` du bundle si inutile, ou accepter le warning.

```
⚠ Module level directives "no babel-plugin-flow-react-proptypes" (react-virtualized)
```
**Fix :** Déjà dans `manualChunks` : `return 'virtualization'`. Warning inoffensif, pas de fix nécessaire.

```
⚠ PWA glob pattern "assets/favicon*.png" matches no files
```
**Fix :** Dans `vite.config.ts` workbox `globPatterns`, supprimer `'assets/favicon*.png'` car les favicons sont dans `/public/assets/` en dev mais pas copiés en dist.

```
⚠ Some chunks larger than 1500kB after minification
```
**Fix :** Désactiver minification (SOLUTION A) ou split davantage les chunks vendor.

### 4.2 npm Deprecation Warnings (à corriger dans package.json)

Ces warnings apparaissent au build mais sont inoffensifs en production :
- `@types/winston@2.4.4` — stub obsolète. **Fix :** `npm uninstall @types/winston` dans `client/package.json`
- `stable@0.1.8` — remplacé par `Array.sort`. Transitif, ignorer.
- `sourcemap-codec@1.4.8` → utiliser `@jridgewell/sourcemap-codec`. Transitif.
- `glob@7.x` et `glob@11.x` — transitifs de dépendances tierces, ignorer.
- `ldapjs@2.3.3` — décommissioné. Si pas utilisé dans client, ignorer.
- `node-domexception@1.0.0` — utiliser DOMException natif. Transitif.

### 4.3 Security Vulnerabilities (npm audit)
```
13 vulnerabilities (6 low, 3 moderate, 4 high)
```
**Fix :** Après build OK, exécuter `npm audit fix --force` dans `client/`. Vérifier qu'il ne casse rien, puis push.

---

## 5. CONFIGURATION VERCEL COMPLÈTE À APPLIQUER

### 5.1 `vercel.json` (RACINE du repo — état actuel déjà correct sauf NODE_OPTIONS)

```json
{
  "buildCommand": "cd client && NODE_OPTIONS=--max-old-space-size=7168 npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://librechat-backend-qf8a.onrender.com/api/$1" },
    { "source": "/oauth/(.*)", "destination": "https://librechat-backend-qf8a.onrender.com/oauth/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 5.2 `client/vercel.json` (NE PAS UTILISER pour le build — ce fichier est ignoré quand on deploy depuis la racine)
Ce fichier existe mais le déploiement se fait depuis la RACINE. Le `client/vercel.json` ne sert qu'en local `vercel dev`.

### 5.3 Variables d'environnement Vercel à définir (via dashboard ou API)

```
OLLAMA_BASE_URL=<URL publique de votre instance Ollama, ex: https://ollama.votredomaine.com>
DISABLE_PWA=true
VITE_DISABLE_MINIFY=true
NODE_ENV=production
```

**Important :** Sans `OLLAMA_BASE_URL`, orchat.js retourne une erreur SSE "OLLAMA_BASE_URL not configured".

Pour ajouter via API Vercel :
```powershell
$tok = "vca_8ilzluOZDTbB867DbdYEn8FAf72bGnZovJK2NN5sMkNmcmaKTB15DIvr"
$tId = "team_C2vaCqL89CLCvwK17DSw6SoY"
$projId = "prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP"

# Ajouter chaque env var :
$body = @{type="encrypted"; key="DISABLE_PWA"; value="true"; target=@("production","preview")} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.vercel.com/v10/projects/$projId/env?teamId=$tId" -Headers @{Authorization="Bearer $tok"; "Content-Type"="application/json"} -Body $body

$body = @{type="encrypted"; key="VITE_DISABLE_MINIFY"; value="true"; target=@("production","preview")} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.vercel.com/v10/projects/$projId/env?teamId=$tId" -Headers @{Authorization="Bearer $tok"; "Content-Type"="application/json"} -Body $body
```

### 5.4 Déploiement correct (depuis la racine du repo)

```powershell
cd "C:\Users\33627\Downloads\LibreChat-main\LibreChat-main"
npx vercel --prod --yes --cwd . 2>&1
```

**NE PAS** déployer depuis `C:\Users\33627\Downloads\LibreChat-main` (dossier parent) — le CLI prend le mauvais projet.  
**NE PAS** déployer depuis `client/` — `cd ..` dans installCommand échoue (pas de package.json parent sur Vercel).

---

## 6. MODIFICATION CODE REQUISE — `client/vite.config.ts`

### 6.1 Fix minification OOM (CRITIQUE)

Trouver la ligne :
```ts
    minify: 'esbuild',
```

Remplacer par :
```ts
    minify: process.env.VITE_DISABLE_MINIFY === 'true' ? false : 'esbuild',
```

### 6.2 Fix glob PWA warning

Trouver dans workbox.globPatterns :
```ts
        globPatterns: [
          '**/*.{js,css,html}',
          'assets/favicon*.png',
          'manifest.webmanifest',
        ],
```

Remplacer par :
```ts
        globPatterns: [
          '**/*.{js,css,html}',
          'manifest.webmanifest',
        ],
```

### 6.3 Fix circular chunk warning (optionnel mais propre)

Dans la section `manualChunks`, avant la ligne `if (normalizedId.includes('node_modules'))`, ajouter :
```ts
          if (normalizedId.includes('node_modules/@anthropic') ||
              normalizedId.includes('node_modules/openai')) {
            return 'http-client';
          }
```

---

## 7. ÉTAT COMPLET DE TOUS LES FICHIERS MODIFIÉS

### `vercel.json` (racine) — ÉTAT ACTUEL

```json
{
  "buildCommand": "cd client && NODE_OPTIONS=--max-old-space-size=4096 npm run build",
  "outputDirectory": "client/dist",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://librechat-backend-qf8a.onrender.com/api/$1" },
    { "source": "/oauth/(.*)", "destination": "https://librechat-backend-qf8a.onrender.com/oauth/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**CHANGER :** `4096` → `7168`

### `client/api/orchat.js` — ÉTAT ACTUEL : OK ✅ (942 lignes, 100% Ollama)

### `librechat.yaml` — ÉTAT ACTUEL : OK ✅ (Ollama only, gemma4)

### `client/api/models.js` — ÉTAT ACTUEL : OK ✅

### `.vercel/project.json` (racine) — ÉTAT ACTUEL : OK ✅
```json
{"projectId":"prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP","orgId":"team_C2vaCqL89CLCvwK17DSw6SoY","projectName":"client"}
```

---

## 8. SÉQUENCE D'EXÉCUTION COMPLÈTE (DANS CET ORDRE)

```
ÉTAPE 1 — Ajouter env vars Vercel (DISABLE_PWA + VITE_DISABLE_MINIFY)
  → Via dashboard.vercel.com/aurion1/client/settings/environment-variables
  → OU via API PowerShell (voir section 5.3)

ÉTAPE 2 — Modifier vercel.json racine
  → NODE_OPTIONS: 4096 → 7168

ÉTAPE 3 — Modifier client/vite.config.ts
  → minify conditionnel selon VITE_DISABLE_MINIFY
  → Supprimer 'assets/favicon*.png' de workbox.globPatterns

ÉTAPE 4 — Commit + Push
  → git add vercel.json client/vite.config.ts
  → git commit -m "fix: OOM on Vercel - disable minify + increase heap + no PWA"
  → git push origin master

ÉTAPE 5 — Déployer depuis la racine du repo
  → cd "C:\Users\33627\Downloads\LibreChat-main\LibreChat-main"
  → npx vercel --prod --yes --cwd . 2>&1

ÉTAPE 6 — Vérifier le déploiement
  → $tok = "vca_8ilzluOZDTbB867DbdYEn8FAf72bGnZovJK2NN5sMkNmcmaKTB15DIvr"
  → $r = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP&teamId=team_C2vaCqL89CLCvwK17DSw6SoY&limit=1" -Headers @{Authorization="Bearer $tok"}
  → $r.deployments[0] | Select-Object url, state

ÉTAPE 7 — Tester l'URL
  → Invoke-WebRequest -Uri "https://client-aurion1.vercel.app" -UseBasicParsing | Select-Object StatusCode
  → Doit retourner 200
```

---

## 9. CE QUI MANQUE ENCORE (ROADMAP POST-DÉPLOIEMENT)

### 9.1 CRITIQUE — Instance Ollama publique
Le frontend est déployé sur Vercel mais `OLLAMA_BASE_URL` doit pointer vers une instance Ollama **publiquement accessible**.
Options :
- **Ngrok** (dev) : `ngrok http 11434` → mettre l'URL HTTPS dans `OLLAMA_BASE_URL`
- **Serveur VPS** : installer Ollama + exposer port 11434 avec nginx reverse proxy + TLS
- **Runpod / Vast.ai** : cloud GPU avec Ollama
- **Ollama Cloud** (si disponible)

Sans ça, le chat retourne `OLLAMA_BASE_URL not configured` ou `connection refused`.

### 9.2 Backend LibreChat (api/)
Le backend Node.js/Express tourne actuellement sur `https://librechat-backend-qf8a.onrender.com`.
Ce backend gère : auth, MongoDB, conversations, agents, MCP servers, fichiers.

Si le backend est down → aucune fonctionnalité sauf le chat direct via `orchat.js`.

Options :
- Vérifier que `https://librechat-backend-qf8a.onrender.com` répond
- Ou déployer le backend ailleurs (Railway, Render, VPS Docker)

### 9.3 Variables d'env backend manquantes
Si nouveau déploiement backend, s'assurer d'avoir :
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CREDS_KEY=...
CREDS_IV=...
OLLAMA_BASE_URL=...
```

### 9.4 Fonctionnalités UI à implémenter (non commencées)
- [ ] Page de connexion brandée "Aurion" (pas "LibreChat")
- [ ] Suppression des références à OpenAI/Anthropic dans l'UI (textes hardcodés)
- [ ] Theme dark par défaut forcé
- [ ] Page d'accueil custom (customWelcome configuré mais pas stylisé)
- [ ] Logo Aurion dans navbar

---

## 10. ARCHITECTURE TECHNIQUE COMPLÈTE

```
┌─────────────────────────────────────────────┐
│  Vercel (Frontend)                          │
│  client/ → Vite → React SPA                │
│  URL: https://client-aurion1.vercel.app     │
│                                             │
│  /api/* → rewrites → Render (Backend)      │
│  /oauth/* → rewrites → Render (Backend)    │
│                                             │
│  Serverless Functions:                      │
│  client/api/orchat.js    → Chat SSE/Ollama  │
│  client/api/models.js    → Liste modèles   │
│  client/api/config.js    → Config UI       │
│  client/api/endpoints.js → Endpoints       │
│  client/api/balance.js   → Balances        │
│  client/api/misc.js      → Misc            │
│  client/api/real-tools.js → Tools          │
│  client/api/mcp-client.js → MCP           │
│  client/api/agents/      → Agent handlers  │
└─────────────────────────────────────────────┘
          ↕ HTTP rewrites
┌─────────────────────────────────────────────┐
│  Render (Backend)                           │
│  api/ → Node.js/Express                    │
│  URL: https://librechat-backend-qf8a.onrender.com │
│  MongoDB, Auth, Conversations, MCP, Files  │
└─────────────────────────────────────────────┘
          ↕ HTTP
┌─────────────────────────────────────────────┐
│  Ollama Instance (À configurer)             │
│  URL: ${OLLAMA_BASE_URL}/v1/chat/completions│
│  Modèle: gemma4                             │
│  Doit être publiquement accessible (HTTPS)  │
└─────────────────────────────────────────────┘
```

---

## 11. COMMANDES UTILES (COPIER-COLLER DIRECT)

### Vérifier état déploiements
```powershell
$tok = "vca_8ilzluOZDTbB867DbdYEn8FAf72bGnZovJK2NN5sMkNmcmaKTB15DIvr"
$tId = "team_C2vaCqL89CLCvwK17DSw6SoY"
$projId = "prj_BI6ijKuGJZt8OhSWjVTfIptIZGcP"
$r = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$projId&teamId=$tId&limit=3" -Headers @{Authorization="Bearer $tok"}
$r.deployments | Select-Object url, state, createdAt | Format-Table
```

### Lire les logs d'un déploiement
```powershell
$dId = "dpl_XXXXXXXXXXXXX"  # remplacer par l'uid du déploiement
$r = Invoke-RestMethod -Uri "https://api.vercel.com/v2/deployments/$dId/events?teamId=$tId&limit=300" -Headers @{Authorization="Bearer $tok"}
$r | ForEach-Object { $_.payload } | Where-Object { $_ -and $_.text } | Select-Object -Last 20 -ExpandProperty text
```

### Ajouter env var Vercel
```powershell
$body = @{type="encrypted"; key="DISABLE_PWA"; value="true"; target=@("production","preview")} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.vercel.com/v10/projects/$projId/env?teamId=$tId" -Headers @{Authorization="Bearer $tok"; "Content-Type"="application/json"} -Body $body

$body = @{type="encrypted"; key="VITE_DISABLE_MINIFY"; value="true"; target=@("production","preview")} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://api.vercel.com/v10/projects/$projId/env?teamId=$tId" -Headers @{Authorization="Bearer $tok"; "Content-Type"="application/json"} -Body $body
```

### Déployer (TOUJOURS depuis la racine du repo)
```powershell
cd "C:\Users\33627\Downloads\LibreChat-main\LibreChat-main"
npx vercel --prod --yes --cwd . 2>&1
```

### Git commit + push
```powershell
cd "C:\Users\33627\Downloads\LibreChat-main\LibreChat-main"
git add -A
git commit -m "fix: OOM on Vercel - disable minify + increase heap"
git push origin master
```

---

## 12. CHECKLIST PRODUCTION-READY

```
Infrastructure
[ ] Déploiement Vercel sans ERROR ni OOM      ← BLOQUER ICI
[ ] URL https://client-aurion1.vercel.app → 200
[ ] Instance Ollama publique accessible
[ ] Backend Render opérationnel
[ ] OLLAMA_BASE_URL configuré sur Vercel

Fonctionnel
[ ] Chat avec gemma4 via Ollama fonctionne
[ ] SSE streaming correct (pas de coupure)
[ ] Login/register fonctionne (backend dépend)
[ ] Conversations sauvegardées (MongoDB)
[ ] MCP servers disponibles dans UI

Qualité
[ ] 0 erreur de build
[ ] 0 warning critique
[ ] npm audit: 0 high/critical vulnérabilités
[ ] Lighthouse score > 80

Branding
[ ] Logo "Aurion" dans navbar
[ ] Page titre "Aurion" (pas "LibreChat")
[ ] Mentions OpenAI/Anthropic supprimées de l'UI
```

---

## 13. RÉSUMÉ EXÉCUTIF (3 LIGNES)

**Problème actuel :** Vercel OOM pendant Vite build — 8164 modules + esbuild minify = dépasse 8GB RAM.  
**Fix immédiat :** Ajouter `DISABLE_PWA=true` + `VITE_DISABLE_MINIFY=true` en env vars Vercel + passer `NODE_OPTIONS=--max-old-space-size=7168` + modifier `vite.config.ts` pour minify conditionnel.  
**Ensuite :** Configurer `OLLAMA_BASE_URL` sur une instance Ollama publique pour que le chat fonctionne réellement.

---
*Fichier généré automatiquement — dernière mise à jour: 2026-04-22*
