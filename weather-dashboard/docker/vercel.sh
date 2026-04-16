#!/usr/bin/env bash
# Wrapper para correr `vercel` via Docker sin instalar nada en el host
#
# Uso:
#   ./docker/vercel.sh login
#   ./docker/vercel.sh           (deploy preview)
#   ./docker/vercel.sh --prod    (deploy produccion)
#   ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_URL production
#
# Variables opcionales:
#   VERCEL_TOKEN - si esta seteada, se usa en vez del login interactivo

set -e
cd "$(dirname "$0")"

# Build de la imagen la primera vez (cacheado despues)
docker compose build --quiet vercel

# Pasar argumentos al CLI
if [ -n "$VERCEL_TOKEN" ]; then
  docker compose run --rm -e VERCEL_TOKEN vercel "$@" --token "$VERCEL_TOKEN"
else
  docker compose run --rm vercel "$@"
fi
