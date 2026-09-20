#!/usr/bin/env bash
# Arma dist/ con lo que se sirve y lo sube a Cloudflare Pages.
# El repo tiene además el README y el Apps Script, que no van al sitio.
set -euo pipefail

PROYECTO="${1:-lourdes-se-recibe}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

rm -rf "$AQUI/dist"
mkdir -p "$AQUI/dist"
cp "$AQUI/index.html" "$AQUI/portada.png" "$AQUI/dist/"

echo "Subiendo a Cloudflare Pages: proyecto $PROYECTO"
wrangler pages deploy "$AQUI/dist" --project-name "$PROYECTO" --branch main --commit-dirty=true
