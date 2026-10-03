# Load testing (issue #36)

A [k6](https://k6.io) simulation of the whole event against a locally running stack, to check that many people
using the apps at the same time don't cause errors, locks or slowdowns. k6 runs in Docker; nothing to install.

**Never run it against the real event database.** It creates test accounts (`loadteam01`…, `loadstaff1`–`3`)
and test adverts. Run it locally, then use **End of Day → Clear Down** and delete the test accounts (or start
again with `docker compose down -v`).

## What it simulates

| Who | How many | What they do |
|---|---|---|
| Student phones | 2 per team (the two phones share the team's account) | Refresh "My uploads" every ~10 s. Each refresh, ~6% chance to upload a 1.9 MB advert, ~6% to publish or withdraw an approved one, ~8% to open one of their images |
| Staff | 3 | Refresh New / Approved / Rejected / Event Communications every ~15 s, open each new upload and approve (90%) or reject it, up to 3 per refresh |
| Projector | 1 | Checks the feed every 3 s, loads a slide image every 12 s, settings every minute |

That is far busier than a real event (a team uploads several adverts a minute instead of a few a day), to leave
headroom. Two scenarios:

-   `steady` (default): everyone busy for `DURATION` (default `5m`), phones arriving over the first 30 s.
-   `burst`: the worst moment, every phone signs in and uploads at the same instant.

Targets (the run fails if any is missed): under 1% errors; 95% of list refreshes under 300 ms (1 s in the burst),
actions under 1 s, sign-ins under 1.5 s, images under 1.5 s, uploads under 5 s.

## Running it

Start the stack (`docker compose up --build -d db backend frontend`), with the bootstrap staff login in `.env`.
Then, from the repo root:

```powershell
# PowerShell; reads the staff login from .env
$envs = @{}; Get-Content .env | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object { $k, $v = $_ -split '=', 2; $envs[$k] = $v }
docker run --rm --network enterprisedaynews_default -v "${PWD}/loadtest:/scripts" `
  -e TEAMS=52 -e SCENARIO=steady -e DURATION=5m `
  -e "ADMIN_USER=$($envs['APP_STAFF_BOOTSTRAP_USERNAME'])" -e "ADMIN_PASS=$($envs['APP_STAFF_BOOTSTRAP_PASSWORD'])" `
  grafana/k6:0.54.0 run /scripts/event-load.js
```

`TEAMS` defaults to 52 (a big event); a normal event is 26.

To find the limit, `.\loadtest\find-limit.ps1` runs the steady scenario at 52, 100, 200, 400, 800 and 1600 teams
(2 minutes each, or `-Teams 52,75,100 -Duration 5m`) and stops at the first that misses the targets. Raw output
goes to `loadtest/results/` (not committed).

Afterwards check the backend log for errors: `docker compose logs backend | Select-String 'ERROR|deadlock'`.

## Results (October 2026)

Measured on a Windows laptop (16 logical CPUs, Docker Desktop), with k6 running on the same machine as the server.

**52 teams, before and after the #36 changes** (response times are 95th percentiles):

| Run | Requests | Errors | List refresh | Upload | Image | Sign-in |
|---|---|---|---|---|---|---|
| Steady, before | 4,713 | 1 (two staff approved the same advert) | 33 ms | 50 ms | 21 ms | 0.9 s |
| Steady, after | 2,319 (2 min) | 0 | 6 ms | 27 ms | 15 ms | |
| Burst (all 104 phones at once), before | 493 | 0 | 722 ms | 359 ms | | 1.0 s |
| Burst, after | 498 | 0 | 483 ms | 474 ms | 364 ms | 1.1 s |

**Finding the limit** (`find-limit.ps1`, 2 minutes per step):

| Teams | Phones | Requests | Errors | List refresh | Upload | Image | |
|---|---|---|---|---|---|---|---|
| 52 | 104 | 2,319 | 0 | 6 ms | 27 ms | 15 ms | OK |
| 100 | 200 | 4,080 | 0 | 4 ms | 31 ms | 8 ms | OK |
| 200 | 400 | 7,707 | 0 | 3 ms | 31 ms | 6 ms | OK |
| 400 | 800 | 15,062 | 0 | 3 ms | 31 ms | 8 ms | OK |
| 600 | 1,200 | 22,723 | 0 | 3 ms | 41 ms | 23 ms | OK |
| 800 | 1,600 | 28,772 | 0 | 515 ms | 1.1 s | 2.4 s | too slow |

Even at 800 teams nothing failed. Most requests were still fast (median 2 ms), but some stalled for seconds while
about 7 adverts a second (≈13 MB/s) were being uploaded. So on this hardware the server copes with **about 600
teams**, over ten times a big event, at an upload rate no real event comes near.

**In practice the Wi-Fi is the limit, not the server.** A single consumer access point typically handles 30–50
busy phones well. For a big event (100+ phones) plan for two or more access points on the same network, and keep
the server and projector on cables. A weaker server than this laptop (e.g. an old mini-PC) lowers the numbers above
but still leaves plenty of headroom; run `find-limit.ps1` on it to check.
