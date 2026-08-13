#!/usr/bin/env bash
# Static deploy to the EC2 / Nginx web root. No npm install / build step.
# Adjust WEBROOT to the target directory Nginx serves for this site.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBROOT="${WEBROOT:-/var/www/tata1mg-dashboard}"

echo "Deploying static site from $ROOT -> $WEBROOT"
sudo mkdir -p "$WEBROOT"
sudo cp "$ROOT/index.html" "$WEBROOT/index.html"
# copy any other static assets if added later:
# sudo cp -r "$ROOT/assets" "$WEBROOT/" 2>/dev/null || true
sudo chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true
echo "Done. Reload Nginx if config changed:  sudo systemctl reload nginx"
