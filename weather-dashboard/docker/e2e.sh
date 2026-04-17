#!/usr/bin/env bash
# ============================================
# Wrapper para correr E2E tests via Docker
# ============================================
# Uso:
#   ./docker/e2e.sh                    # Correr todos los tests
#   ./docker/e2e.sh e2e/api.spec.ts    # Correr solo un archivo
#   ./docker/e2e.sh --headed           # Con browser visible (no funciona en Docker)
#
# Requisitos:
#   - Docker corriendo
#   - .env.local con credenciales de Supabase dev
#
# Output:
#   - Resultado en consola
#   - Screenshots de fallos en test-results/
#   - Report HTML en playwright-report/

set -e
cd "$(dirname "$0")"

echo "=== E2E Tests (Playwright via Docker) ==="

# Verificar que .env.local existe
if [ ! -f ../.env.local ]; then
  echo "ERROR: weather-dashboard/.env.local no existe"
  echo "Crear con las credenciales de Supabase dev"
  exit 1
fi

# Limpiar resultados anteriores
rm -rf ../test-results ../playwright-report

# Build de la imagen (cacheado despues de la primera vez)
echo "Building image..."
docker compose -f docker-compose.e2e.yml build --quiet e2e

# Correr tests
echo "Running tests..."
docker compose -f docker-compose.e2e.yml run --rm e2e "$@"
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "=== Todos los tests pasaron ==="
else
  echo "=== Algunos tests fallaron ==="
  echo "Screenshots en: weather-dashboard/test-results/"
  echo "Report: weather-dashboard/playwright-report/"
fi

exit $EXIT_CODE
