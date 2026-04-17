#!/usr/bin/env bash
# ============================================
# Backup de la base de datos Supabase
# ============================================
# Genera un dump SQL comprimido con pg_dump via Docker.
# No instala nada en tu maquina.
#
# Uso:
#   # Backup de prod
#   source supabase/.env.prod
#   ./supabase/backup.sh
#
#   # Backup de dev
#   source supabase/.env.dev
#   ./supabase/backup.sh
#
# Output:
#   supabase/backups/backup_YYYY-MM-DD_HHMMSS.sql.gz
#
# Restaurar:
#   gunzip -c supabase/backups/backup_xxx.sql.gz | \
#     docker run -i --rm postgres:16-alpine psql "$DATABASE_URL"

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no esta seteado"
  echo ""
  echo "Uso:"
  echo "  source supabase/.env.prod && ./supabase/backup.sh"
  echo "  source supabase/.env.dev  && ./supabase/backup.sh"
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# Extraer el host del DATABASE_URL para mostrar a que DB estamos conectando
DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@\([^:]*\).*/\1/' | head -c 30)
echo "=== Backup de Supabase ==="
echo "Target: ...@${DB_HOST}..."
echo "Output: ${FILEPATH}"
echo ""

# pg_dump via Docker, comprimir con gzip
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  postgres:17-alpine \
  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --format=plain \
  | gzip > "$FILEPATH"

# Verificar que el archivo no este vacio
SIZE=$(wc -c < "$FILEPATH" | tr -d ' ')
if [ "$SIZE" -lt 100 ]; then
  echo "ERROR: Backup parece vacio (${SIZE} bytes)"
  rm -f "$FILEPATH"
  exit 1
fi

SIZE_KB=$((SIZE / 1024))
echo "Backup completado: ${FILENAME} (${SIZE_KB} KB)"
echo ""

# Listar backups existentes
echo "=== Backups disponibles ==="
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print $5, $6, $7, $8, $9}'

# Limpiar backups > 30 dias
DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete -print | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  echo ""
  echo "Limpiados: ${DELETED} backups con mas de 30 dias"
fi
