#!/usr/bin/env bash
set -euo pipefail

# Build backend/frontend images with a stamped APP_VERSION, then push latest+version tags.
# Usage:
#   ./build-and-push.sh
#   ./build-and-push.sh --version 2026.05.14-120000-ab12cd3
#   ./build-and-push.sh --build-only
#   ./build-and-push.sh --dry-run

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=""
BUILD_ONLY="false"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="${2:-}"
      shift 2
      ;;
    --build-only)
      BUILD_ONLY="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION="$(date -u +%Y.%m.%d-%H%M%S)-$(git rev-parse --short HEAD)"
fi

BACKEND_IMAGE="ghcr.io/seasoned-coder/news-backend"
FRONTEND_IMAGE="ghcr.io/seasoned-coder/news-frontend"

run_cmd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
  else
    eval "$*"
  fi
}

echo "Using APP_VERSION=$VERSION"

export APP_VERSION="$VERSION"
run_cmd "docker compose build"

run_cmd "docker tag ${BACKEND_IMAGE}:latest ${BACKEND_IMAGE}:${APP_VERSION}"
run_cmd "docker tag ${FRONTEND_IMAGE}:latest ${FRONTEND_IMAGE}:${APP_VERSION}"

if [[ "$BUILD_ONLY" == "true" ]]; then
  echo "Build-only mode: skipping push"
  exit 0
fi

run_cmd "docker push ${BACKEND_IMAGE}:latest"
run_cmd "docker push ${FRONTEND_IMAGE}:latest"
run_cmd "docker push ${BACKEND_IMAGE}:${APP_VERSION}"
run_cmd "docker push ${FRONTEND_IMAGE}:${APP_VERSION}"

echo "Done. Pushed tags: latest and ${APP_VERSION}"

