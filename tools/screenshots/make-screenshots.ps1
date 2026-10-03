# Regenerates the README screenshots in docs/screenshots (issue #44).
#
#   .\tools\screenshots\make-screenshots.ps1            # uses the ghcr.io ...:latest images
#   .\tools\screenshots\make-screenshots.ps1 -Build     # builds the images from this checkout first
#
# Starts a separate demo stack (Compose project "newsdemo", http://127.0.0.1:3100) with made-up teams and
# adverts, captures the pages with the installed Chrome (headless), then deletes the demo stack and its data.
# Your normal local stack and its data are not touched. Needs Docker, Node 20+ and Chrome.
param(
    [switch]$Build,
    [switch]$KeepRunning,
    # Somewhere else to save them, e.g. to check a change without touching the README's images.
    [string]$OutDir
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = Resolve-Path (Join-Path $here "..\..")
if (-not $OutDir) { $OutDir = Join-Path $repo "docs\screenshots" }

if ($Build) {
    docker compose -f (Join-Path $repo "docker-compose.yml") build backend frontend
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
}

# A throwaway password for the demo staff login, never written anywhere.
$env:DEMO_STAFF_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$compose = @("compose", "-p", "newsdemo", "-f", (Join-Path $here "docker-compose.yml"))

try {
    & docker @compose up -d
    if ($LASTEXITCODE -ne 0) { throw "could not start the demo stack" }

    Push-Location $here
    try {
        if (-not (Test-Path node_modules)) { npm install --no-audit --no-fund | Out-Null }
        node screenshots.mjs $OutDir
        if ($LASTEXITCODE -ne 0) { throw "screenshots failed" }
    } finally {
        Pop-Location
    }
} finally {
    if (-not $KeepRunning) { & docker @compose down -v | Out-Null }
    Remove-Item Env:\DEMO_STAFF_PASSWORD
}
