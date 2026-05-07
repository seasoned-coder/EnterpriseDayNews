#!/bin/bash
cd /home/kevinpeirce2/EnterpriseDayNews

# 1. Pull the pre-built images from GitHub
# This is much faster than building!
/usr/bin/docker compose pull

# 2. Restart containers with the fresh images
/usr/bin/docker compose up -d --remove-orphans

# 3. Cleanup old image versions to save disk space
/usr/bin/docker image prune -f

# 4. Refresh DNS
/usr/bin/curl -s "https://freedns.afraid.org/dynamic/update.php?cUVaZXZQUllSdWlRa0REeTRVRTZBWXBuOjI1OTE4MjM2"