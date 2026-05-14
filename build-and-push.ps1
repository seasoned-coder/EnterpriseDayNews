param(
  [string]$Version,
  [switch]$BuildOnly,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Build backend/frontend images with a stamped APP_VERSION, then push latest+version tags.
# Usage:
#   .\build-and-push.ps1
#   .\build-and-push.ps1 -Version 2026.05.14-120000-ab12cd3
#   .\build-and-push.ps1 -BuildOnly
#   .\build-and-push.ps1 -DryRun

Set-Location $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($Version)) {
  $utc = (Get-Date).ToUniversalTime().ToString("yyyy.MM.dd-HHmmss")
  $sha = (git rev-parse --short HEAD).Trim()
  $Version = "$utc-$sha"
}

$backendImage = "ghcr.io/seasoned-coder/news-backend"
$frontendImage = "ghcr.io/seasoned-coder/news-frontend"

function Invoke-Step {
  param([string]$Command)

  if ($DryRun) {
    Write-Host "[dry-run] $Command"
    return
  }

  Write-Host "> $Command"
  Invoke-Expression $Command
}

Write-Host "Using APP_VERSION=$Version"
$env:APP_VERSION = $Version

Invoke-Step "docker compose build"

Invoke-Step "docker tag $backendImage`:latest $backendImage`:$Version"
Invoke-Step "docker tag $frontendImage`:latest $frontendImage`:$Version"

if ($BuildOnly) {
  Write-Host "Build-only mode: skipping push"
  exit 0
}

Invoke-Step "docker push $backendImage`:latest"
Invoke-Step "docker push $frontendImage`:latest"
Invoke-Step "docker push $backendImage`:$Version"
Invoke-Step "docker push $frontendImage`:$Version"

Write-Host "Done. Pushed tags: latest and $Version"

