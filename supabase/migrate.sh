#!/usr/bin/env bash
# ============================================
# Wrapper para aplicar migraciones
# ============================================
# Uso:
#   # Cargar env vars segun target
#   source .env.dev    # o .env.prod
#
#   # Aplicar todas las migraciones pendientes
#   ./supabase/migrate.sh
#
# Variables:
#   DATABASE_URL - connection string de Postgres de Supabase
#     Formato: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
#     Obtener desde: Supabase Dashboard > Settings > Database > Connection string > URI
#
# Seguridad:
#   - Los archivos .env.dev / .env.prod NO se suben a Git (cubiertos por .gitignore)
#   - Usa el "session mode" o "transaction mode" pooler (puerto 6543)

set -e

cd "$(dirname "$0")/docker"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no esta seteado"
  echo ""
  echo "Cargar primero un archivo de env:"
  echo "  source supabase/.env.dev    # para desarrollo"
  echo "  source supabase/.env.prod   # para produccion"
  echo ""
  echo "O pasarlo inline:"
  echo "  DATABASE_URL='postgresql://...' ./supabase/migrate.sh"
  exit 1
fi

# Build silencioso la primera vez (cached despues)
docker compose build --quiet migrate

# Ejecutar migraciones
docker compose run --rm -e DATABASE_URL migrate
