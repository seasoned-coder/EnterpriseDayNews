#!/bin/bash

# This script runs in GCP and is a cheap hack to auto deploy the latest code!

cd /path/to/your/repo

git fetch
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL != $REMOTE ]; then
    echo "$(date): New changes detected. Deploying..."
    git pull

    # --build ensures your app code updates
    # --remove-orphans cleans up services you might have deleted from the YAML
    sudo docker compose up -d --build --remove-orphans

    # Optional: Cleans up old 'dangling' images to save disk space on your 30GB free disk
    sudo docker image prune -f
fi