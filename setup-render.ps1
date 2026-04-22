<#
================================================================================
  AURION / LibreChat — Setup Render backend en UNE commande
================================================================================
  Configure toutes les variables d'environnement nécessaires sur le service
  Render `librechat-api-ew3n`, puis déclenche un redeploy avec cache propre.

  UTILISATION
  -----------
  1. Récupère ta clé API Render: https://dashboard.render.com/u/settings#api-keys
     (Create API Key → copie la valeur rnd_xxxxx)

  2. Lance:
       .\setup-render.ps1 -RenderApiKey "rnd_TA_CLE_ICI"

     Options:
       -AllowRegistration  (par défaut $true) — active l'inscription
       -ForceRedeploy      (par défaut $true) — redéploie après mise à jour
================================================================================
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RenderApiKey,

  [string]$ServiceName = 'librechat-api-ew3n',

  [string]$OllamaApiKey = '9723511e6e784c58825fa05bb003d88a.PEz4JpkeYj_Qtml2RxFMPIZP',
  [string]$OllamaBaseUrl = 'https://ollama.com',

  [bool]$AllowRegistration = $true,
  [bool]$ForceRedeploy = $true
)

$ErrorActionPreference = 'Stop'
$headers = @{
  Authorization  = "Bearer $RenderApiKey"
  Accept         = 'application/json'
  'Content-Type' = 'application/json'
}

function Write-Step { param([string]$m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-OK   { param([string]$m) Write-Host "  OK  $m" -ForegroundColor Green }
function Write-Err  { param([string]$m) Write-Host "  ERR $m" -ForegroundColor Red }

# ---------- 1. Trouve le service ----------
Write-Step "Recherche du service '$ServiceName' sur Render"
$services = Invoke-RestMethod -Uri 'https://api.render.com/v1/services?limit=100' -Headers $headers
$svc = $services | Where-Object { $_.service.name -eq $ServiceName -or $_.service.slug -eq $ServiceName } | Select-Object -First 1
if (-not $svc) {
  Write-Err "Service '$ServiceName' introuvable. Services disponibles:"
  $services | ForEach-Object { Write-Host "   - $($_.service.name) (id=$($_.service.id))" }
  exit 1
}
$serviceId = $svc.service.id
Write-OK "Service trouvé → id=$serviceId"

# ---------- 2. Mise à jour des variables d'env ----------
$envVars = @(
  @{ key = 'OLLAMA_BASE_URL';     value = $OllamaBaseUrl }
  @{ key = 'OLLAMA_API_KEY';      value = $OllamaApiKey }
  @{ key = 'ALLOW_REGISTRATION';  value = ([string]$AllowRegistration).ToLower() }
  @{ key = 'ALLOW_EMAIL_LOGIN';   value = 'true' }
  @{ key = 'ALLOW_SOCIAL_LOGIN';  value = 'true' }
  # MCP / agentic
  @{ key = 'ENDPOINTS';           value = 'agents,custom' }
  # z.ai fallback (au cas où)
  @{ key = 'ZHIPU_API_KEY';       value = $OllamaApiKey }
)

Write-Step "Mise à jour des variables d'environnement"
# L'API Render envVars PUT remplace la liste complète — on récupère d'abord l'existant
$existing = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars?limit=200" -Headers $headers
$existingMap = @{}
foreach ($e in $existing) { $existingMap[$e.envVar.key] = $e.envVar.value }

# Fusion: on préserve tout ce qui existe, on ajoute/écrase nos clés
foreach ($v in $envVars) { $existingMap[$v.key] = $v.value }

$payload = @()
foreach ($k in $existingMap.Keys) {
  $payload += @{ key = $k; value = $existingMap[$k] }
}

$body = $payload | ConvertTo-Json -Depth 5 -Compress
$url = "https://api.render.com/v1/services/$serviceId/env-vars"
try {
  Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $body | Out-Null
  Write-OK "$($envVars.Count) variables poussées (total $($payload.Count) env vars)"
  foreach ($v in $envVars) { Write-Host "     $($v.key) = $(if ($v.value.Length -gt 40) { $v.value.Substring(0,8) + '…' + $v.value.Substring($v.value.Length-4) } else { $v.value })" }
} catch {
  Write-Err "PUT env-vars failed: $($_.Exception.Message)"
  Write-Err $_.ErrorDetails.Message
  exit 2
}

# ---------- 3. Déclenche un redeploy ----------
if ($ForceRedeploy) {
  Write-Step "Déclenchement d'un redeploy (clearCache=clear)"
  $dplBody = @{ clearCache = 'clear' } | ConvertTo-Json
  try {
    $deploy = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" -Method POST -Headers $headers -Body $dplBody
    Write-OK "Deploy lancé → id=$($deploy.id) status=$($deploy.status)"
    Write-Host "`n  Live URL: https://dashboard.render.com/web/$serviceId"
    Write-Host "  Suivi:    https://dashboard.render.com/web/$serviceId/events"
  } catch {
    Write-Err "Deploy failed: $($_.Exception.Message) :: $($_.ErrorDetails.Message)"
    exit 3
  }

  # ---------- 4. Polling ----------
  Write-Step "Attente que le deploy soit live (max 10min)…"
  $deployId = $deploy.id
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 10
    try {
      $d = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys/$deployId" -Headers $headers
      Write-Host "  [$i] status=$($d.status)"
      if ($d.status -eq 'live') {
        Write-OK 'Backend Render LIVE avec la nouvelle config'
        break
      }
      if ($d.status -in 'build_failed','update_failed','canceled','deactivated') {
        Write-Err "Deploy a échoué: $($d.status)"
        break
      }
    } catch {
      Write-Host "  poll err: $($_.Exception.Message)"
    }
  }
}

# ---------- 5. Smoke test ----------
Write-Step 'Smoke test: /api/config + /api/endpoints'
try {
  $cfg = Invoke-RestMethod 'https://client-gold-zeta.vercel.app/api/config' -TimeoutSec 20
  $regOK = if ($cfg.registrationEnabled) { 'OUI' } else { 'NON (redeploy peut-être pas fini)' }
  Write-OK "registrationEnabled=$regOK / emailLoginEnabled=$($cfg.emailLoginEnabled)"
} catch {
  Write-Err "smoke test failed: $_"
}

Write-Host "`nTerminé. Tu peux maintenant t'inscrire sur https://client-gold-zeta.vercel.app/register" -ForegroundColor Cyan
