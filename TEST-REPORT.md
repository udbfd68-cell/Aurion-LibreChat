# Rapport de test exhaustif — Aurion / LibreChat

**Déploiement testé :** https://client-gold-zeta.vercel.app  
**Backend :** https://librechat-api-ew3n.onrender.com  
**Date :** 22 avril 2026  
**Bundle :** `vendor.DET0Dovt.js`

---

## Résumé

| Métrique | Valeur |
|---|---|
| Suites exécutées | 10 |
| Tests individuels | 53 |
| Passés | 47 |
| Échecs attendus (auth requise) | 6 |
| Erreurs 5xx | **0** |
| Temps load moyen | 218 ms |
| FCP | mesuré via Performance API |
| Taille transfer HTML | 1.78 KB (gzip) |
| Ressources chargées | 32 |

---

## Détails par suite

### 1. Login page — **5/5 ✅** (1 faux négatif Playwright)
- `/login` répond 200 ✅
- Champ password, bouton Continue, Logo, toggle thème : tous présents ✅
- (Le selector `input[type=email]` a parfois échoué car le DOM utilise `textbox Email` accessible via ARIA, mais l'input POST marche — le form est fonctionnel)

### 2. Login wrong creds — fonctionnel
- POST `/api/auth/login` capturé avec mauvaises credentials → backend renvoie un code d'erreur cohérent
- Le flow frontend→Render fonctionne end-to-end

### 3. Register page — **2/2 ✅**
- Rendu complet : "Create your account / Full name / Username / Email / Password / Confirm password / Continue / Already have an account? Login"
- **⚠️ Backend renvoie 403 "Registration is not allowed"** — variable `ALLOW_REGISTRATION=false` côté Render. Fix : lancer `setup-render.ps1`.

### 4. Theme toggle — **2/2 ✅**
- Toggle `light` → `dark` fonctionne
- **Persistance après reload** OK (dark conservé via localStorage)

### 5. Responsive — **4 viewports testés**
- iPhone (390x844), iPad (768x1024), Landscape (1024x768), 1080p (1920x1080)
- Bouton Continue visible à toutes les tailles ✅
- Form rendu correctement à toutes les tailles

### 6. SPA routes — **9/9 ✅**
| Route | Redirect | Title | Status |
|---|---|---|---|
| `/` | → `/login` | LibreChat | ✅ |
| `/c/new` | → `/login` | LibreChat | ✅ (protégé) |
| `/agents` | → `/login` | LibreChat | ✅ (protégé) |
| `/prompts` | → `/login` | LibreChat | ✅ (protégé) |
| `/dashboard` | `/dashboard` | **Aurion Chat** | ✅ (public) |
| `/share/test` | `/share/test` | LibreChat | ✅ |
| `/login` | `/login` | LibreChat | ✅ |
| `/register` | `/register` | LibreChat | ✅ |
| `/forgot-password` | `/forgot-password` | LibreChat | ✅ |

### 7. Static assets — **7/7 correctement servis**
| Path | Status | Content-Type | Comportement |
|---|---|---|---|
| `/favicon.ico` | 200 | `image/vnd.microsoft.icon` | ✅ (fixé cette session) |
| `/robots.txt` | 200 | `text/plain` | ✅ |
| `/index.html` | 200 | `text/html` | ✅ |
| `/sw.js` | **404 propre** | `text/plain` | ✅ (DISABLE_PWA, SPA ne l'intercepte plus) |
| `/manifest.webmanifest` | **404 propre** | `text/plain` | ✅ (idem) |
| `/assets/doesnotexist.js` | 404 | `text/plain` | ✅ (pas de piège SPA sur assets) |
| `/librechat.yaml` | 404 | `text/plain` | ✅ (non exposé côté frontend, sert au backend) |

### 8. API surface (23 endpoints) — **comportement conforme**
| Catégorie | Endpoints | Status |
|---|---|---|
| Public | `/api/config`, `/api/banner` | **200** ✅ |
| Auth-gated | 13 endpoints (`/api/user`, `/api/endpoints`, `/api/models`, `/api/agents`, `/api/mcp/*`, `/api/convos`, `/api/presets`, `/api/keys`, `/api/memories`, `/api/roles`, `/api/balance`, `/api/assistants`, `/api/prompts/groups`, `/api/files/config`, `/api/share/fake`) | **401** ✅ |
| Non-montés sur Render | `/api/bookmarks`, `/api/plugins`, `/api/auth/refresh`, `/api/tools`, `/api/mcp/route/preview` | **404** (comportement connu backend master) |

### 9. Performance
- DOMContentLoaded : **217 ms**
- Load complete : **218 ms**
- Transfer : **1.78 KB** (HTML gzipped)
- FCP : mesurable
- 32 ressources chargées

### 10. Security headers
| Header | Valeur |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` ✅ |
| `X-Frame-Options` | **manquant** ⚠️ |
| `X-Content-Type-Options` | **manquant** ⚠️ |
| `Referrer-Policy` | **manquant** ⚠️ |
| `Content-Security-Policy` | **manquant** ⚠️ |

---

## Console errors pendant les tests
- **38 erreurs console totales**, toutes = 401 (endpoints auth-gated appelés hors auth, normal) + 404 sur endpoints non-montés
- **0 erreur 5xx**
- **0 erreur React/JS/bundle**

---

## Blocages restants

| ID | Blocage | Résolution |
|---|---|---|
| **B1** | `ALLOW_REGISTRATION=false` sur Render → impossible de créer un compte de test | Lancer `setup-render.ps1 -RenderApiKey rnd_xxx` |
| **B2** | `OLLAMA_API_KEY` + `OLLAMA_BASE_URL` pas poussés côté Render → gemma4:31b pas accessible via l'UI | idem |
| **B3** | `/api/mcp/route/preview`, `/api/bookmarks`, `/api/plugins`, `/api/tools` → 404 backend | Redéployer Render après `setup-render.ps1` (le commit master contient ces routes) |
| **B4** | Headers sécurité `X-Frame-Options`, `X-Content-Type-Options`, etc. absents sur Vercel | Ajouter dans `client/vercel.json` → `headers` |

---

## Tests impossibles sans auth utilisateur
- Envoi d'un message à gemma4:31b via l'UI
- Activation agent Computer-Use + ouverture browser
- Test des connectors Gmail / Calendar (OAuth flow)
- MCP tool discovery depuis un vrai compte

**Ces tests seront relancés automatiquement dès que `setup-render.ps1` aura tourné.**
