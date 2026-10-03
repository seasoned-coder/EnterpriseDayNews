#!/bin/bash
cd /home/kevinpeirce2/EnterpriseDayNews

# Secrets live in the untracked .env file (see .env.example). docker compose reads it automatically;
# load it here too for the DNS update below.
if [ ! -f .env ]; then
    echo "$(date): .env not found - copy .env.example to .env and fill it in. Aborting deploy." >&2
    exit 1
fi
set -a
. ./.env
set +a

# 1. Pull the pre-built images from GitHub
# This is much faster than building!
/usr/bin/docker compose pull

# 2. Restart containers with the fresh images
/usr/bin/docker compose up -d --remove-orphans

# 3. Cleanup old image versions to save disk space
/usr/bin/docker image prune -f

# 4. Refresh DNS
if [ -n "$FREEDNS_UPDATE_KEY" ]; then
    /usr/bin/curl -s "https://freedns.afraid.org/dynamic/update.php?${FREEDNS_UPDATE_KEY}"
fi