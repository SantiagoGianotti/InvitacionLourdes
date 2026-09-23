#!/usr/bin/env bash
# Arma dist/ con lo que se sirve y lo sube a Cloudflare Pages.
# El repo tiene además el README y el Apps Script, que no van al sitio.
set -euo pipefail

RAMA="${1:-main}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

rm -rf "$AQUI/dist"
mkdir -p "$AQUI/dist"
cp "$AQUI/index.html" "$AQUI/portada.png" \
   "$AQUI/favicon.svg" "$AQUI/favicon-32.png" "$AQUI/icon-180.png" \
   "$AQUI/_worker.js" "$AQUI/dist/"

echo "Subiendo a Cloudflare Pages (rama $RAMA)"
# proyecto y carpeta salen de wrangler.jsonc
cd "$AQUI" && wrangler pages deploy --branch "$RAMA" --commit-dirty=true
