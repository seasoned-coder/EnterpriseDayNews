# Finds roughly how many teams the server can support (issue #36): runs the steady event simulation at
# growing team counts and prints one line per step. Stops after the first step that misses the targets
# (more than 1% errors, or slow responses: see the thresholds in event-load.js).
#
#   .\loadtest\find-limit.ps1                         # 52, 100, 200, 400, 800, 1600 teams, 2 minutes each
#   .\loadtest\find-limit.ps1 -Teams 52,75,100 -Duration 5m
#
# Needs the stack running (docker compose up -d db backend frontend) and .env with the bootstrap staff login.
# It creates loadteam* / loadstaff* accounts and test adverts: run Event Reset (and delete the accounts)
# afterwards, and never run it against the real event database.
param(
    [int[]]$Teams = @(52, 100, 200, 400, 800, 1600),
    [string]$Duration = "2m",
    [string]$Network = "enterprisedaynews_default"
)

$repo = Split-Path $PSScriptRoot -Parent
$envs = @{}
Get-Content (Join-Path $repo ".env") | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    $envs[$k] = $v
}
$results = Join-Path $PSScriptRoot "results"
New-Item -ItemType Directory -Force $results | Out-Null

foreach ($t in $Teams) {
    $summary = "/scripts/results/teams-$t.json"
    docker run --rm --network $Network -v "${PSScriptRoot}:/scripts" `
        -e "TEAMS=$t" -e "DURATION=$Duration" `
        -e "ADMIN_USER=$($envs['APP_STAFF_BOOTSTRAP_USERNAME'])" -e "ADMIN_PASS=$($envs['APP_STAFF_BOOTSTRAP_PASSWORD'])" `
        grafana/k6:0.54.0 run --quiet --summary-export $summary /scripts/event-load.js *> (Join-Path $results "teams-$t.log")
    $passed = $LASTEXITCODE -eq 0

    $m = (Get-Content (Join-Path $results "teams-$t.json") -Raw | ConvertFrom-Json).metrics
    $line = "{0,5} teams ({1,5} phones): {2,6} requests, errors {3,6:P2}, p95 refresh {4,6:N0} ms, p95 upload {5,6:N0} ms, p95 image {6,6:N0} ms  {7}" -f `
        $t, ($t * 2), $m.http_reqs.count, $m.http_req_failed.value,
        $m.'http_req_duration{kind:poll}'.'p(95)', $m.'http_req_duration{kind:upload}'.'p(95)',
        $m.'http_req_duration{kind:image}'.'p(95)', $(if ($passed) { "OK" } else { "MISSED TARGETS" })
    $line
    if (-not $passed) { break }
}
