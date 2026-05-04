#!/bin/bash
# This script runs in GCP and is a cheap hack to auto deploy the latest code!

# Move into your project folder
cd /home/kevinpeirce2/EnterpriseDayNews

# Update git
/usr/bin/git fetch
LOCAL=$(/usr/bin/git rev-parse HEAD)
REMOTE=$(/usr/bin/git rev-parse @{u})

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): New changes detected. Deploying..."
    /usr/bin/git pull

    # Run docker without sudo (since we added the group)
    /usr/bin/docker compose up -d --build --remove-orphans

    # Optional cleanup
    /usr/bin/docker image prune -f
else
    echo "$(date): No changes found."
fi